import { requireSupabase } from './supabase.js';

function redact(value) {
  if (value == null) return null;
  return String(value)
    .replace(/\b(?:sb_(?:publishable|secret)_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g, '[credencial omitida]')
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[URL omitida]')
    .replace(/Failing row contains\s+\(.+\)/i, 'Failing row contents omitted for privacy.')
    .replace(/Key \(([^)]+)\)=\(([^)]+)\)/gi, 'Key ($1)=([valor omitido])');
}

function reportSupabaseError(operation, original) {
  const diagnostic = {
    operation,
    code: original?.code ?? null,
    message: redact(original?.message ?? 'Erro Supabase sem mensagem.'),
    details: redact(original?.details),
    hint: redact(original?.hint)
  };
  console.error('[100 Receio] Falha na operação Supabase', diagnostic);

  const error = new Error(original?.message || 'Falha na operação Supabase.');
  error.name = 'SupabaseOperationError';
  error.code = original?.code;
  error.details = original?.details;
  error.hint = original?.hint;
  error.operation = operation;
  return error;
}

function checked(result, operation = 'consulta') {
  if (result.error) throw reportSupabaseError(operation, result.error);
  return result.data;
}

export async function getCategories() {
  const client = requireSupabase();
  return checked(await client.from('categorias_receitas').select('id,nome').order('nome'), 'categorias_receitas.select') ?? [];
}

export async function getRecipes({ view = 'home', query = '', category = '' } = {}) {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  let request = client.from('receitas').select('id,usuario_id,categoria_id,titulo,descricao,tempo_preparo_minutos,rendimento,imagem_url,visibilidade,criado_em,categorias_receitas(nome)');
  if (view === 'mine') {
    if (!user) throw new Error('Entre na sua conta para acessar suas receitas.');
    request = request.eq('usuario_id', user.id);
  } else if (view === 'favorites') {
    if (!user) throw new Error('Entre na sua conta para acessar seus favoritos.');
    const favoriteRows = checked(await client.from('receitas_favoritas').select('receita_id').order('criado_em', { ascending: false })) ?? [];
    if (!favoriteRows.length) return [];
    request = request.in('id', favoriteRows.map((row) => row.receita_id)).eq('visibilidade', 'publica').neq('usuario_id', user.id);
  } else {
    request = request.eq('visibilidade', 'publica');
  }
  if (query.trim()) request = request.ilike('titulo', `%${query.trim().replace(/[%_,]/g, ' ')}%`);
  if (category) request = request.eq('categoria_id', category);
  return checked(await request.order('criado_em', { ascending: false })) ?? [];
}

export async function getRecipe(id) {
  const client = requireSupabase();
  const recipe = checked(await client.from('receitas').select('*,categorias_receitas(nome)').eq('id', id).maybeSingle(), 'receitas.select');
  if (!recipe) return null;
  const [ingredients, steps] = await Promise.all([
    client.from('ingredientes_receita').select('id,nome,quantidade,unidade,ordem').eq('receita_id', id).order('ordem'),
    client.from('etapas_receita').select('id,instrucao,ordem').eq('receita_id', id).order('ordem')
  ]);
  return {
    ...recipe,
    ingredients: checked(ingredients, 'ingredientes_receita.select') ?? [],
    steps: checked(steps, 'etapas_receita.select') ?? []
  };
}

export async function getFavoriteIds() {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return new Set();
  const rows = checked(await client.from('receitas_favoritas').select('receita_id')) ?? [];
  return new Set(rows.map((row) => row.receita_id));
}

export async function toggleFavorite(recipeId, favorite) {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Entre na sua conta para salvar favoritos.');
  const result = favorite
    ? await client.from('receitas_favoritas').delete().eq('receita_id', recipeId).eq('usuario_id', user.id)
    : await client.from('receitas_favoritas').insert({ receita_id: recipeId, usuario_id: user.id });
  checked(result);
}

function cleanList(values, fields) {
  return values.map((value, ordem) => {
    const item = { ordem };
    for (const field of fields) item[field] = (value[field] ?? '').trim();
    return item;
  });
}

export async function saveRecipe(payload, existingId = null) {
  const client = requireSupabase();
  const { data, error: authError } = await client.auth.getUser();
  if (authError) throw reportSupabaseError('auth.getUser', authError);
  const user = data.user;
  if (!user) throw new Error('Sua sessão expirou. Entre novamente para salvar a receita.');
  const ingredients = cleanList(payload.ingredients.filter((item) => item.nome.trim()), ['nome', 'quantidade', 'unidade']);
  const steps = cleanList(payload.steps.filter((item) => item.instrucao.trim()), ['instrucao']);
  const recipeFields = {
    titulo: payload.titulo,
    descricao: payload.descricao,
    categoria_id: payload.categoria_id,
    tempo_preparo_minutos: payload.tempo_preparo_minutos,
    rendimento: payload.rendimento,
    imagem_url: payload.imagem_url,
    observacoes: payload.observacoes,
    visibilidade: payload.visibilidade
  };
  const ingredientRows = ingredients.map((item) => ({ ...item, receita_id: existingId }));
  const stepRows = steps.map((item) => ({ ...item, receita_id: existingId }));

  if (!existingId) {
    const recipe = checked(
      await client.from('receitas').insert({ ...recipeFields, usuario_id: user.id }).select('id').single(),
      'receitas.insert'
    );
    const recipeId = recipe.id;
    ingredientRows.forEach((item) => { item.receita_id = recipeId; });
    stepRows.forEach((item) => { item.receita_id = recipeId; });

    try {
      if (ingredientRows.length) checked(
        await client.from('ingredientes_receita').insert(ingredientRows),
        'ingredientes_receita.insert'
      );
      if (stepRows.length) checked(
        await client.from('etapas_receita').insert(stepRows),
        'etapas_receita.insert'
      );
    } catch (saveError) {
      const rollback = await client.from('receitas').delete().eq('id', recipeId).eq('usuario_id', user.id);
      if (rollback.error) reportSupabaseError('receitas.rollback', rollback.error);
      throw saveError;
    }
    return recipeId;
  }

  const previous = await getRecipe(existingId);
  if (!previous || previous.usuario_id !== user.id) {
    throw new Error('A receita não existe mais ou você não tem permissão para editá-la.');
  }

  const updated = checked(
    await client.from('receitas').update(recipeFields).eq('id', existingId).eq('usuario_id', user.id).select('id').maybeSingle(),
    'receitas.update'
  );
  if (!updated) throw new Error('A receita não existe mais ou você não tem permissão para editá-la.');

  try {
    checked(await client.from('ingredientes_receita').delete().eq('receita_id', existingId), 'ingredientes_receita.delete');
    if (ingredients.length) checked(
      await client.from('ingredientes_receita').insert(ingredients.map((item) => ({ ...item, receita_id: existingId }))),
      'ingredientes_receita.insert'
    );
    checked(await client.from('etapas_receita').delete().eq('receita_id', existingId), 'etapas_receita.delete');
    if (steps.length) checked(
      await client.from('etapas_receita').insert(steps.map((item) => ({ ...item, receita_id: existingId }))),
      'etapas_receita.insert'
    );
  } catch (saveError) {
    await restoreRecipe(client, previous, user.id);
    throw saveError;
  }
  return existingId;
}

async function restoreRecipe(client, previous, userId) {
  const id = previous.id;
  const recipeFields = {
    titulo: previous.titulo,
    descricao: previous.descricao,
    categoria_id: previous.categoria_id,
    tempo_preparo_minutos: previous.tempo_preparo_minutos,
    rendimento: previous.rendimento,
    imagem_url: previous.imagem_url,
    observacoes: previous.observacoes,
    visibilidade: previous.visibilidade
  };
  const attempt = async (operation, query) => {
    const result = await query;
    if (result.error) reportSupabaseError(operation, result.error);
  };

  await attempt('receitas.rollback', client.from('receitas').update(recipeFields).eq('id', id).eq('usuario_id', userId));
  await attempt('ingredientes_receita.rollback.delete', client.from('ingredientes_receita').delete().eq('receita_id', id));
  const oldIngredients = previous.ingredients.map(({ nome, quantidade, unidade, ordem }) => ({ receita_id: id, nome, quantidade, unidade, ordem }));
  if (oldIngredients.length) await attempt('ingredientes_receita.rollback.insert', client.from('ingredientes_receita').insert(oldIngredients));
  await attempt('etapas_receita.rollback.delete', client.from('etapas_receita').delete().eq('receita_id', id));
  const oldSteps = previous.steps.map(({ instrucao, ordem }) => ({ receita_id: id, instrucao, ordem }));
  if (oldSteps.length) await attempt('etapas_receita.rollback.insert', client.from('etapas_receita').insert(oldSteps));
}

export async function deleteRecipe(id) {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Entre na sua conta para excluir uma receita.');
  const result = checked(await client.from('receitas').delete().eq('id', id).eq('usuario_id', user.id).select('id'));
  if (!result?.length) throw new Error('A receita não existe mais ou você não tem permissão para excluí-la.');
}
