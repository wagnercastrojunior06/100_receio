import { isConfigured, supabase } from './supabase.js';
import { deleteRecipe, getCategories, getFavoriteIds, getRecipe, getRecipes, saveRecipe, toggleFavorite } from './data.js';

const app = document.querySelector('#app');
const headerActions = document.querySelector('#header-actions');
let session = null;
let dirty = false;

const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const safeImage = (value) => {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
};
const params = () => new URLSearchParams(location.search);
const currentView = () => params().get('view') || 'home';
const toast = (title, icon = 'success') => window.Swal?.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: 2600, timerProgressBar: true });
const errorText = (error) => {
  const text = error?.message || 'Ocorreu um erro inesperado.';
  const code = error?.code || '';
  if (/Invalid login credentials/i.test(text)) return 'E-mail ou senha incorretos.';
  if (/User already registered/i.test(text)) return 'Este e-mail já possui uma conta.';
  if (/Password should be at least/i.test(text)) return 'Use uma senha com pelo menos 6 caracteres.';
  if (/Email not confirmed/i.test(text)) return 'Confirme seu e-mail antes de entrar.';
  if (/Failed to fetch|fetch failed/i.test(text)) return 'Não foi possível conectar ao Supabase. Confira sua conexão e a configuração do projeto.';
  if (code === 'PGRST202' || /Could not find the function/i.test(text)) return 'A API do Supabase não encontrou a função solicitada no schema cache. Confira a função chamada pelo cliente e a exposição do schema.';
  if (code === 'PGRST205' || /Could not find the table|relation .* does not exist/i.test(text)) return 'A API do Supabase não encontrou a tabela consultada. Confira o nome da tabela e o schema exposto.';
  if (code === 'PGRST204') return 'A API do Supabase não reconheceu uma coluna enviada. Confira os nomes dos campos e o schema cache.';
  if (code === '42501' && /row-level security|violates row-level/i.test(text)) return 'A política RLS recusou esta operação para sua conta. Confira se a receita pertence ao usuário autenticado.';
  if (code === '42501' || /permission denied/i.test(text)) return 'O papel atual do Supabase não tem permissão SQL para esta operação. Confira os grants da tabela; as políticas RLS continuam ativas.';
  if (code === '23503') return 'Uma referência da receita não existe ou não está acessível. Confira a categoria e a receita associadas.';
  if (code === '23502' || code === '23514') return 'Algum campo obrigatório ou regra de validação do banco não foi atendido. Confira título, ingrediente e etapa.';
  if (/schema cache/i.test(text)) return 'A API do Supabase está com schema cache incompatível com a solicitação. Confira a operação e os nomes expostos.';
  if (/duplicate key|already exists/i.test(text)) return 'Este item já está salvo.';
  if (error instanceof Error && !error.code && !error.status) return text;
  return 'Ocorreu um erro ao acessar o Supabase. Confira a configuração do banco e tente novamente.';
};
function setBusy(value) { app.setAttribute('aria-busy', String(value)); }
function setNav() {
  const nav = document.querySelector('.main-nav');
  nav.querySelector('[data-nav="mine"]').hidden = !session;
  nav.querySelector('[data-nav="favorites"]').hidden = !session;
  nav.querySelectorAll('a').forEach((link) => {
    const target = link.dataset.nav;
    const view = currentView();
    const active = target === 'home' ? ['home', 'recipe'].includes(view) : target === view;
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  headerActions.innerHTML = session
    ? `<span class="user-label" title="${esc(session.user.email)}">${esc(session.user.email)}</span><a class="button button-primary button-small" href="./?view=recipe-form">Nova receita</a><button class="button button-secondary button-small" data-action="logout">Sair</button>`
    : '<button class="button button-secondary button-small" data-action="auth">Entrar</button>';
}
function shell(title, description, action = '') {
  return `<div class="hero"><div><p class="eyebrow">Seu caderno de receitas</p><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
}
function emptyState(title, description, action = '') {
  return `<section class="empty-state"><div class="empty-icon" aria-hidden="true">🍲</div><h2>${title}</h2><p>${description}</p>${action}</section>`;
}
function errorState(error, retry = true) {
  return `<section class="error-state"><h2>Não conseguimos carregar esta página</h2><p>${esc(errorText(error))}</p>${retry ? '<button class="button button-secondary" data-action="retry">Tentar novamente</button>' : ''}</section>`;
}
function categoryOptions(categories, selected = '') {
  return `<option value="">Todas as categorias</option>${categories.map((category) => `<option value="${esc(category.id)}" ${category.id === selected ? 'selected' : ''}>${esc(category.nome)}</option>`).join('')}`;
}
function recipeCard(recipe, favoriteIds = new Set()) {
  const image = safeImage(recipe.imagem_url);
  const favorite = favoriteIds.has(recipe.id);
  const category = recipe.categorias_receitas?.nome;
  const description = recipe.descricao?.trim();
  return `<article class="recipe-card">
    ${image ? `<img class="recipe-image" src="${esc(image)}" alt="${esc(recipe.titulo)}" loading="lazy" referrerpolicy="no-referrer">` : '<div class="recipe-image-placeholder" aria-hidden="true">🍲</div>'}
    <div class="recipe-card-body"><h3>${esc(recipe.titulo)}</h3><p>${esc(description || 'Uma receita para guardar no seu caderno.')}</p>
    <div class="recipe-meta">${category ? `<span class="tag">${esc(category)}</span>` : ''}${recipe.tempo_preparo_minutos != null ? `<span>${esc(recipe.tempo_preparo_minutos)} min</span>` : ''}</div>
    <div class="recipe-card-actions"><a class="button button-secondary button-small" href="./?view=recipe&id=${encodeURIComponent(recipe.id)}">Ver receita</a>${session && recipe.usuario_id !== session.user.id ? `<button class="icon-button" data-action="favorite" data-id="${esc(recipe.id)}" aria-label="${favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}" aria-pressed="${favorite}"><i data-lucide="heart" aria-hidden="true"></i></button>` : ''}</div></div>
  </article>`;
}
async function renderList() {
  const view = currentView();
  const mine = view === 'mine';
  const favorites = view === 'favorites';
  const heading = mine ? 'Minhas receitas' : favorites ? 'Meus favoritos' : 'Receitas para provar';
  const intro = mine ? 'Tudo o que você já guardou no seu caderno.' : favorites ? 'Receitas públicas que você marcou para fazer depois.' : 'Descubra receitas compartilhadas por quem cozinha como você.';
  const categories = await getCategories().catch(() => []);
  const favoriteIds = await getFavoriteIds();
  const query = params().get('q') || '';
  const category = params().get('category') || '';
  app.innerHTML = `${shell(heading, intro, session ? '<a class="button button-primary" href="./?view=recipe-form">＋ Nova receita</a>' : '')}
    <form class="search-panel" id="search-form"><div class="form-field"><label for="search-query">Buscar por nome</label><input id="search-query" name="q" type="search" value="${esc(query)}" placeholder="Ex.: bolo de cenoura"></div>${categories.length ? `<div class="form-field"><label for="search-category">Categoria</label><select id="search-category" name="category">${categoryOptions(categories, category)}</select></div>` : ''}<button class="button button-secondary" type="submit">Buscar</button></form>
    <div id="recipe-results" aria-live="polite"><div class="loading-state"><span class="spinner" aria-hidden="true"></span><p>Buscando receitas…</p></div></div>`;
  try {
    const recipes = await getRecipes({ view, query, category });
    const target = document.querySelector('#recipe-results');
    if (!recipes.length) {
      target.innerHTML = mine
        ? emptyState('Seu caderno ainda está vazio.', 'Que tal guardar sua primeira receita?', '<a class="button button-primary" href="./?view=recipe-form">Criar receita</a>')
        : favorites ? emptyState('Nenhum favorito por enquanto.', 'Explore as receitas públicas e salve as que quiser preparar.')
          : emptyState('Nenhuma receita encontrada.', 'Tente outro nome ou volte mais tarde para ver novas receitas.');
    } else target.innerHTML = `<div class="recipe-grid">${recipes.map((recipe) => recipeCard(recipe, favoriteIds)).join('')}</div>`;
    window.lucide?.createIcons();
  } catch (error) {
    const target = document.querySelector('#recipe-results');
    if (target) target.innerHTML = errorState(error);
  }
}
async function renderDetail() {
  const id = params().get('id');
  if (!id) { app.innerHTML = errorState(new Error('O endereço da receita está incompleto.'), false); return; }
  app.innerHTML = '<div class="loading-state"><span class="spinner" aria-hidden="true"></span><p>Abrindo receita…</p></div>';
  try {
    const recipe = await getRecipe(id);
    if (!recipe) { app.innerHTML = errorState(new Error('Esta receita não existe ou não está disponível para sua conta.'), false); return; }
    const owner = session?.user.id === recipe.usuario_id;
    const favoriteIds = await getFavoriteIds();
    const image = safeImage(recipe.imagem_url);
    const canFavorite = session && !owner && recipe.visibilidade === 'publica';
    app.innerHTML = `<article class="recipe-detail">${image ? `<img class="detail-cover" src="${esc(image)}" alt="${esc(recipe.titulo)}" referrerpolicy="no-referrer">` : '<div class="detail-placeholder" aria-hidden="true">🍲</div>'}<div class="detail-content">
      <div class="detail-top"><div><p class="eyebrow">${recipe.visibilidade === 'publica' ? 'Receita pública' : 'Receita privada'}${recipe.categorias_receitas?.nome ? ` · ${esc(recipe.categorias_receitas.nome)}` : ''}</p><h1>${esc(recipe.titulo)}</h1>${recipe.descricao ? `<p class="detail-description">${esc(recipe.descricao)}</p>` : ''}</div><div class="detail-actions">${owner ? `<a class="button button-secondary" href="./?view=recipe-form&id=${encodeURIComponent(id)}">Editar</a><button class="button button-danger" data-action="delete" data-id="${esc(id)}">Excluir</button>` : ''}${canFavorite ? `<button class="button button-secondary" data-action="favorite" data-id="${esc(id)}" aria-pressed="${favoriteIds.has(id)}"><i data-lucide="heart" aria-hidden="true"></i>${favoriteIds.has(id) ? 'Nos favoritos' : 'Favoritar'}</button>` : ''}${recipe.visibilidade === 'publica' ? '<button class="button button-secondary" data-action="share">Compartilhar</button>' : ''}</div></div>
      <div class="detail-stats">${recipe.tempo_preparo_minutos != null ? `<span class="detail-stat">⏱ ${esc(recipe.tempo_preparo_minutos)} minutos</span>` : ''}${recipe.rendimento ? `<span class="detail-stat">🍽 ${esc(recipe.rendimento)}</span>` : ''}</div>
      <section class="detail-section"><h2>Ingredientes</h2>${recipe.ingredients.length ? `<ul class="ingredient-list">${recipe.ingredients.map((item) => `<li>${item.quantidade ? `${esc(item.quantidade)} ` : ''}${item.unidade ? `${esc(item.unidade)} de ` : ''}${esc(item.nome)}</li>`).join('')}</ul>` : '<p>Nenhum ingrediente informado.</p>'}</section>
      <section class="detail-section"><h2>Modo de preparo</h2>${recipe.steps.length ? `<ol class="step-list">${recipe.steps.map((step) => `<li>${esc(step.instrucao).replace(/\n/g, '<br>')}</li>`).join('')}</ol>` : '<p>Nenhuma etapa informada.</p>'}</section>
      ${recipe.observacoes ? `<section class="detail-section"><h2>Observações</h2><p class="notes">${esc(recipe.observacoes).replace(/\n/g, '<br>')}</p></section>` : ''}<p class="owner-label">${owner ? 'Esta receita pertence ao seu caderno.' : ''}</p></div></article>`;
    window.lucide?.createIcons();
  } catch (error) { app.innerHTML = errorState(error, false); }
}
function authView(mode = 'login') {
  const title = { login: 'Bem-vindo de volta', signup: 'Crie sua conta', reset: 'Recuperar senha', 'new-password': 'Escolha uma nova senha' }[mode] || 'Entre na sua conta';
  const content = mode === 'new-password'
    ? `<div class="form-field"><label for="password">Nova senha</label><input id="password" name="password" type="password" minlength="6" autocomplete="new-password" required></div><button class="button button-primary" type="submit">Salvar nova senha</button>`
    : mode === 'reset'
      ? `<div class="form-field"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="email" required></div><button class="button button-primary" type="submit">Enviar link de recuperação</button>`
      : `<div class="form-field"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="email" required></div><div class="form-field"><label for="password">Senha</label><input id="password" name="password" type="password" minlength="6" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" required></div><button class="button button-primary" type="submit">${mode === 'signup' ? 'Criar conta' : 'Entrar'}</button>`;
  app.innerHTML = `<section class="auth-shell"><p class="eyebrow">Acesse seu caderno</p><h1>${title}</h1><form class="stack" data-form="${mode}">${content}</form><p class="auth-switch">${mode === 'login' ? `Ainda não tem conta? <button data-action="auth-mode" data-mode="signup" type="button">Criar conta</button><br><button data-action="auth-mode" data-mode="reset" type="button">Esqueci minha senha</button>` : mode === 'signup' || mode === 'reset' ? `Já tem conta? <button data-action="auth-mode" data-mode="login" type="button">Entrar</button>` : '<a href="./">Voltar ao início</a>'}</p></section>`;
}
function addIngredientRow(container, value = {}) {
  const row = document.createElement('div'); row.className = 'list-row ingredient-row';
  row.innerHTML = `<input name="quantity" aria-label="Quantidade" placeholder="2" value="${esc(value.quantidade || '')}"><input name="unit" aria-label="Unidade" placeholder="xícaras" value="${esc(value.unidade || '')}"><input name="name" aria-label="Ingrediente" placeholder="Farinha de trigo" value="${esc(value.nome || '')}"><button type="button" class="remove-row" data-action="remove-row" aria-label="Remover ingrediente">×</button>`; container.append(row);
}
function addStepRow(container, value = {}) {
  const row = document.createElement('div'); row.className = 'list-row step-row';
  const number = container.children.length + 1;
  row.innerHTML = `<span class="step-number" aria-hidden="true">${number}.</span><textarea name="instruction" aria-label="Etapa ${number}" placeholder="Descreva esta etapa" required>${esc(value.instrucao || '')}</textarea><button type="button" class="remove-row" data-action="remove-row" aria-label="Remover etapa">×</button>`; container.append(row);
}
async function renderRecipeForm() {
  if (!session) { location.href = './?view=auth'; return; }
  const id = params().get('id');
  let recipe = null;
  try {
    if (id) {
      recipe = await getRecipe(id);
      if (!recipe || recipe.usuario_id !== session.user.id) throw new Error('Você não tem permissão para editar esta receita.');
    }
    const categories = await getCategories();
    app.innerHTML = `<section class="form-shell"><p class="eyebrow">${id ? 'Seu caderno' : 'Uma receita nova'}</p><h1>${id ? 'Editar receita' : 'Criar receita'}</h1><p>Os campos com * são necessários para guardar a receita.</p>
      <form id="recipe-form" class="stack"><div class="form-grid">
        <div class="form-field span-2"><label for="title">Nome da receita *</label><input id="title" name="titulo" maxlength="150" value="${esc(recipe?.titulo || '')}" required></div>
        <div class="form-field span-2"><label for="description">Descrição</label><textarea id="description" name="descricao" placeholder="Conte um pouco sobre esta receita">${esc(recipe?.descricao || '')}</textarea></div>
        <div class="form-field"><label for="category">Categoria</label><select id="category" name="categoria_id"><option value="">Sem categoria</option>${categories.map((item) => `<option value="${esc(item.id)}" ${item.id === recipe?.categoria_id ? 'selected' : ''}>${esc(item.nome)}</option>`).join('')}</select></div>
        <div class="form-field"><label for="time">Tempo de preparo (minutos)</label><input id="time" name="tempo_preparo_minutos" type="number" min="0" step="1" value="${recipe?.tempo_preparo_minutos ?? ''}"></div>
        <div class="form-field"><label for="yield">Rendimento</label><input id="yield" name="rendimento" maxlength="100" value="${esc(recipe?.rendimento || '')}" placeholder="Ex.: 8 porções"></div>
        <div class="form-field"><label for="image">Imagem por URL</label><input id="image" name="imagem_url" type="url" value="${esc(recipe?.imagem_url || '')}" placeholder="https://"></div>
      </div>
      <section class="form-section"><h2>Ingredientes *</h2><div id="ingredients" class="list-editor"></div><button class="button button-secondary button-small" type="button" data-action="add-ingredient">＋ Adicionar ingrediente</button></section>
      <section class="form-section"><h2>Modo de preparo *</h2><div id="steps" class="list-editor"></div><button class="button button-secondary button-small" type="button" data-action="add-step">＋ Adicionar etapa</button></section>
      <section class="form-section"><div class="form-field"><label for="notes">Observações pessoais</label><textarea id="notes" name="observacoes" placeholder="Dicas, substituições ou lembranças">${esc(recipe?.observacoes || '')}</textarea></div></section>
      <section class="form-section"><label class="checkbox-row"><input type="checkbox" name="publica" ${recipe?.visibilidade === 'publica' ? 'checked' : ''}><span><strong>Compartilhar esta receita publicamente</strong><br>Receitas públicas podem ser vistas por qualquer pessoa. Suas observações também serão exibidas.</span></label></section>
      <div class="form-actions"><a class="button button-secondary" href="${id ? `./?view=recipe&id=${encodeURIComponent(id)}` : '/?view=mine'}">Cancelar</a><button class="button button-primary" type="submit">Salvar receita</button></div></form></section>`;
    const ingredientContainer = document.querySelector('#ingredients');
    const stepContainer = document.querySelector('#steps');
    (recipe?.ingredients?.length ? recipe.ingredients : [{}]).forEach((item) => addIngredientRow(ingredientContainer, item));
    (recipe?.steps?.length ? recipe.steps : [{}, {}]).forEach((item) => addStepRow(stepContainer, item));
    dirty = false;
  } catch (error) { app.innerHTML = errorState(error, false); }
}
async function render() {
  setBusy(true); setNav();
  try {
    if (!isConfigured) {
      app.innerHTML = `<section class="error-state"><h1>Configure o Supabase</h1><p>O site já está pronto, mas falta configurar <code>SUPABASE_URL</code> e <code>SUPABASE_ANON_KEY</code> no arquivo <code>js/config.js</code>. Edite esse arquivo e recarregue o site.</p></section>`;
      return;
    }
    const view = currentView();
    if (view === 'auth') authView(params().get('mode') || 'login');
    else if (view === 'mine' || view === 'favorites' || view === 'home') await renderList();
    else if (view === 'recipe') await renderDetail();
    else if (view === 'recipe-form') await renderRecipeForm();
    else app.innerHTML = errorState(new Error('A página solicitada não foi encontrada.'), false);
  } finally { setBusy(false); }
}
function goAuth(mode) { location.href = `./?view=auth&mode=${encodeURIComponent(mode)}`; }

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  try {
    if (action === 'auth') goAuth('login');
    if (action === 'auth-mode') goAuth(button.dataset.mode);
    if (action === 'retry') await renderList();
    if (action === 'add-ingredient') addIngredientRow(document.querySelector('#ingredients'));
    if (action === 'add-step') addStepRow(document.querySelector('#steps'));
    if (action === 'remove-row') { button.closest('.list-row').remove(); document.querySelectorAll('.step-row').forEach((row, index) => { row.querySelector('.step-number').textContent = `${index + 1}.`; row.querySelector('textarea').setAttribute('aria-label', `Etapa ${index + 1}`); }); }
    if (action === 'logout') {
      const { error } = await supabase.auth.signOut(); if (error) throw error;
      session = null; history.replaceState(null, '', './'); await render(); toast('Você saiu da sua conta.');
    }
    if (action === 'favorite') {
      button.disabled = true;
      const wasFavorite = button.getAttribute('aria-pressed') === 'true';
      await toggleFavorite(button.dataset.id, wasFavorite);
      toast(wasFavorite ? 'Receita removida dos favoritos.' : 'Receita salva nos favoritos.');
      await render();
    }
    if (action === 'delete') {
      const result = await window.Swal.fire({ title: 'Excluir esta receita?', text: 'Esta ação também remove ingredientes e etapas.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Excluir receita', cancelButtonText: 'Manter receita', confirmButtonColor: '#b84c43' });
      if (!result.isConfirmed) return;
      await deleteRecipe(button.dataset.id); toast('Receita excluída.'); location.href = './?view=mine';
    }
    if (action === 'share') {
      const url = location.href;
      if (navigator.share) await navigator.share({ title: document.querySelector('h1')?.textContent || 'Receita', url });
      else { await navigator.clipboard.writeText(url); toast('Link copiado.'); }
    }
  } catch (error) { window.Swal?.fire({ icon: 'error', title: 'Não foi possível concluir', text: errorText(error) }); }
});

document.addEventListener('submit', async (event) => {
  const form = event.target;
  if (form.id === 'search-form') {
    event.preventDefault(); const values = new FormData(form); const query = new URLSearchParams({ view: currentView() });
    if (values.get('q')) query.set('q', values.get('q'));
    if (values.get('category')) query.set('category', values.get('category'));
    history.pushState(null, '', `./?${query}`); await render(); return;
  }
  if (form.dataset.form) {
    event.preventDefault();
    const values = new FormData(form);
    try {
      let result;
      if (form.dataset.form === 'login') result = await supabase.auth.signInWithPassword({ email: values.get('email'), password: values.get('password') });
      if (form.dataset.form === 'signup') result = await supabase.auth.signUp({ email: values.get('email'), password: values.get('password'), options: { emailRedirectTo: new URL("./", location.href).href } });
      if (form.dataset.form === 'reset') result = await supabase.auth.resetPasswordForEmail(values.get('email'), { redirectTo: new URL("./?view=auth&mode=new-password", location.href).href });
      if (form.dataset.form === 'new-password') result = await supabase.auth.updateUser({ password: values.get('password') });
      if (result?.error) throw result.error;
      if (form.dataset.form === 'signup') { await window.Swal?.fire('Confira seu e-mail', 'Enviamos um link para confirmar sua conta.', 'success'); goAuth('login'); }
      else if (form.dataset.form === 'reset') { await window.Swal?.fire('Confira seu e-mail', 'Se houver uma conta com esse endereço, enviaremos um link de recuperação.', 'success'); goAuth('login'); }
      else if (form.dataset.form === 'new-password') { await window.Swal?.fire('Senha atualizada', 'Você já pode entrar com sua nova senha.', 'success'); goAuth('login'); }
      else { session = (await supabase.auth.getSession()).data.session; location.href = './'; }
    } catch (error) { window.Swal?.fire({ icon: 'error', title: 'Não foi possível acessar', text: errorText(error) }); }
    return;
  }
  if (form.id === 'recipe-form') {
    event.preventDefault();
    const submitButton = form.querySelector('[type="submit"]'); submitButton.disabled = true; submitButton.textContent = 'Salvando…';
    const values = new FormData(form);
    const ingredients = [...form.querySelectorAll('.ingredient-row')].map((row) => ({ quantidade: row.querySelector('[name="quantity"]').value, unidade: row.querySelector('[name="unit"]').value, nome: row.querySelector('[name="name"]').value }));
    const steps = [...form.querySelectorAll('.step-row')].map((row) => ({ instrucao: row.querySelector('[name="instruction"]').value }));
    const imageValue = values.get('imagem_url').trim();
    if (imageValue && !safeImage(imageValue)) { window.Swal?.fire({ icon: 'error', title: 'Imagem inválida', text: 'Informe uma URL que comece com http:// ou https://.' }); submitButton.disabled = false; submitButton.textContent = 'Salvar receita'; return; }
    const payload = { titulo: values.get('titulo').trim(), descricao: values.get('descricao').trim() || null, categoria_id: values.get('categoria_id') || null, tempo_preparo_minutos: values.get('tempo_preparo_minutos') ? Number(values.get('tempo_preparo_minutos')) : null, rendimento: values.get('rendimento').trim() || null, imagem_url: imageValue || null, observacoes: values.get('observacoes').trim() || null, visibilidade: values.get('publica') ? 'publica' : 'privada', ingredients, steps };
    if (!payload.titulo || !ingredients.some((item) => item.nome.trim()) || !steps.some((item) => item.instrucao.trim())) { window.Swal?.fire({ icon: 'error', title: 'Complete os campos necessários', text: 'Informe o nome, pelo menos um ingrediente e uma etapa de preparo.' }); submitButton.disabled = false; submitButton.textContent = 'Salvar receita'; return; }
    try {
      const id = await saveRecipe(payload, params().get('id'));
      dirty = false; toast('Receita salva.'); location.href = `./?view=recipe&id=${encodeURIComponent(id)}`;
    } catch (error) {
      await window.Swal?.fire({ icon: 'error', title: 'Não foi possível salvar', text: `${errorText(error)} Se estiver editando, confira os dados e tente salvar novamente.` });
      submitButton.disabled = false; submitButton.textContent = 'Salvar receita';
    }
  }
});

document.addEventListener('input', (event) => { if (event.target.closest('#recipe-form')) dirty = true; });
document.addEventListener('error', (event) => {
  const image = event.target;
  if (image instanceof HTMLImageElement && ['recipe-image', 'detail-cover'].some((name) => image.classList.contains(name))) {
    const fallback = document.createElement('div'); fallback.className = image.classList.contains('detail-cover') ? 'detail-placeholder' : 'recipe-image-placeholder'; fallback.textContent = '🍲'; fallback.setAttribute('aria-hidden', 'true'); image.replaceWith(fallback);
  }
}, true);
window.addEventListener('beforeunload', (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('popstate', () => render());

if (isConfigured) {
  supabase.auth.getSession().then(({ data }) => { session = data.session; render(); }).catch(() => render());
  supabase.auth.onAuthStateChange((_event, nextSession) => { session = nextSession; setNav(); });
} else render();
