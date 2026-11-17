-- ============================================================
-- CADERNO DE RECEITAS — ESQUEMA INICIAL PARA SUPABASE
-- Banco: PostgreSQL / Supabase
-- Execute no SQL Editor do projeto Supabase.
--
-- Recursos:
--   * Receitas criadas e editadas por cada usuário
--   * Ingredientes e etapas em tabelas próprias
--   * Categorias personalizáveis por usuário
--   * Favoritos (para receitas públicas de outros usuários)
--   * RLS para proteger os dados
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. CATEGORIAS
-- Categorias globais de exemplo e categorias criadas pelo usuário.
-- ------------------------------------------------------------

create table if not exists public.categorias_receitas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users (id) on delete cascade,
  nome text not null check (char_length(trim(nome)) > 0),
  carga_inicial boolean not null default false,
  criado_em timestamptz not null default now(),
  constraint categorias_receitas_origem_valida check (
    (carga_inicial = true and usuario_id is null)
    or (carga_inicial = false and usuario_id is not null)
  )
);

create unique index if not exists categorias_receitas_iniciais_unicas
  on public.categorias_receitas (lower(nome))
  where carga_inicial = true;

create unique index if not exists categorias_receitas_usuario_unicas
  on public.categorias_receitas (usuario_id, lower(nome))
  where usuario_id is not null;


-- ------------------------------------------------------------
-- 2. RECEITAS
-- Uma receita pertence a um usuário. O dono pode editar e excluir.
-- visibilidade 'privada' é o padrão; 'publica' permite leitura pública
-- para usuários autenticados e visitantes anônimos conforme as políticas abaixo.
-- ------------------------------------------------------------

create table if not exists public.receitas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  categoria_id uuid references public.categorias_receitas (id)
    on delete set null,
  titulo text not null
    check (char_length(trim(titulo)) between 1 and 150),
  descricao text,
  tempo_preparo_minutos integer
    check (tempo_preparo_minutos is null or tempo_preparo_minutos >= 0),
  rendimento text,
  imagem_url text,
  observacoes text,
  visibilidade text not null default 'privada'
    check (visibilidade in ('privada', 'publica')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists receitas_usuario_atualizadas_idx
  on public.receitas (usuario_id, atualizado_em desc);

create index if not exists receitas_categoria_idx
  on public.receitas (categoria_id);

create index if not exists receitas_publicas_idx
  on public.receitas (visibilidade, criado_em desc);


-- ------------------------------------------------------------
-- 3. INGREDIENTES
-- Cada ingrediente pertence a uma receita.
-- quantidade é texto para aceitar valores como "1/2", "a gosto",
-- "uma pitada" ou "200".
-- ------------------------------------------------------------

create table if not exists public.ingredientes_receita (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid not null references public.receitas (id)
    on delete cascade,
  nome text not null check (char_length(trim(nome)) > 0),
  quantidade text,
  unidade text,
  ordem integer not null default 0 check (ordem >= 0),
  criado_em timestamptz not null default now()
);

create index if not exists ingredientes_receita_ordem_idx
  on public.ingredientes_receita (receita_id, ordem);


-- ------------------------------------------------------------
-- 4. ETAPAS DO MODO DE PREPARO
-- Uma receita pode ter várias etapas, ordenadas.
-- ------------------------------------------------------------

create table if not exists public.etapas_receita (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid not null references public.receitas (id)
    on delete cascade,
  instrucao text not null check (char_length(trim(instrucao)) > 0),
  ordem integer not null default 0 check (ordem >= 0),
  criado_em timestamptz not null default now()
);

create index if not exists etapas_receita_ordem_idx
  on public.etapas_receita (receita_id, ordem);


-- ------------------------------------------------------------
-- 5. FAVORITOS
-- Permite que o usuário marque receitas públicas de outros usuários.
-- As receitas próprias já aparecem em "Minhas receitas".
-- ------------------------------------------------------------

create table if not exists public.receitas_favoritas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  receita_id uuid not null references public.receitas (id)
    on delete cascade,
  criado_em timestamptz not null default now(),
  constraint receita_favorita_unica unique (usuario_id, receita_id)
);

create index if not exists receitas_favoritas_usuario_idx
  on public.receitas_favoritas (usuario_id, criado_em desc);


-- ------------------------------------------------------------
-- 6. ATUALIZAÇÃO AUTOMÁTICA DO CAMPO atualizado_em
-- ------------------------------------------------------------

create or replace function public.definir_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists receitas_atualizado_em_trigger on public.receitas;

create trigger receitas_atualizado_em_trigger
before update on public.receitas
for each row
execute function public.definir_atualizado_em();


-- ------------------------------------------------------------
-- 7. CATEGORIAS INICIAIS
-- Categorias compartilhadas e somente para leitura.
-- ------------------------------------------------------------

insert into public.categorias_receitas (usuario_id, nome, carga_inicial)
values
  (null, 'Café da manhã', true),
  (null, 'Almoço', true),
  (null, 'Jantar', true),
  (null, 'Lanches', true),
  (null, 'Sobremesas', true),
  (null, 'Bolos e tortas', true),
  (null, 'Massas', true),
  (null, 'Saladas', true),
  (null, 'Bebidas', true),
  (null, 'Outros', true)
on conflict (lower(nome)) where carga_inicial = true do nothing;


-- ------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------

alter table public.categorias_receitas enable row level security;
alter table public.receitas enable row level security;
alter table public.ingredientes_receita enable row level security;
alter table public.etapas_receita enable row level security;
alter table public.receitas_favoritas enable row level security;


-- Categorias: todos os usuários autenticados podem ler as iniciais
-- e as próprias. Cada usuário gerencia somente as suas categorias.

drop policy if exists "categorias_receitas_leitura" on public.categorias_receitas;
create policy "categorias_receitas_leitura"
  on public.categorias_receitas for select to authenticated
  using (
    carga_inicial = true
    or usuario_id = (select auth.uid())
    or exists (
      select 1 from public.receitas r
      where r.categoria_id = public.categorias_receitas.id
        and r.visibilidade = 'publica'
    )
  );

-- Visitantes só veem categorias iniciais ou categorias vinculadas a
-- receitas públicas; nomes de categorias privadas não são expostos.
drop policy if exists "categorias_receitas_leitura_publica" on public.categorias_receitas;
create policy "categorias_receitas_leitura_publica"
  on public.categorias_receitas for select to anon
  using (
    carga_inicial = true
    or exists (
      select 1 from public.receitas r
      where r.categoria_id = public.categorias_receitas.id
        and r.visibilidade = 'publica'
    )
  );

drop policy if exists "categorias_receitas_inserir_propria" on public.categorias_receitas;
create policy "categorias_receitas_inserir_propria"
  on public.categorias_receitas for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and carga_inicial = false
  );

drop policy if exists "categorias_receitas_atualizar_propria" on public.categorias_receitas;
create policy "categorias_receitas_atualizar_propria"
  on public.categorias_receitas for update to authenticated
  using (usuario_id = (select auth.uid()) and carga_inicial = false)
  with check (usuario_id = (select auth.uid()) and carga_inicial = false);

drop policy if exists "categorias_receitas_excluir_propria" on public.categorias_receitas;
create policy "categorias_receitas_excluir_propria"
  on public.categorias_receitas for delete to authenticated
  using (usuario_id = (select auth.uid()) and carga_inicial = false);


-- Receitas: o dono pode fazer tudo; usuários autenticados podem
-- visualizar receitas marcadas como públicas.

drop policy if exists "receitas_visualizar" on public.receitas;
create policy "receitas_visualizar"
  on public.receitas for select to authenticated
  using (
    usuario_id = (select auth.uid())
    or visibilidade = 'publica'
  );

drop policy if exists "receitas_visualizar_publicas_anon" on public.receitas;
create policy "receitas_visualizar_publicas_anon"
  on public.receitas for select to anon
  using (visibilidade = 'publica');

drop policy if exists "receitas_inserir_propria" on public.receitas;
create policy "receitas_inserir_propria"
  on public.receitas for insert to authenticated
  with check (usuario_id = (select auth.uid()));

drop policy if exists "receitas_atualizar_propria" on public.receitas;
create policy "receitas_atualizar_propria"
  on public.receitas for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

drop policy if exists "receitas_excluir_propria" on public.receitas;
create policy "receitas_excluir_propria"
  on public.receitas for delete to authenticated
  using (usuario_id = (select auth.uid()));


-- Ingredientes: só o dono da receita pode consultar ou alterar.
-- A leitura de ingredientes de receitas públicas também é permitida.

drop policy if exists "ingredientes_visualizar" on public.ingredientes_receita;
create policy "ingredientes_visualizar"
  on public.ingredientes_receita for select to authenticated
  using (
    exists (
      select 1 from public.receitas r
      where r.id = receita_id
        and (r.usuario_id = (select auth.uid()) or r.visibilidade = 'publica')
    )
  );

drop policy if exists "ingredientes_visualizar_publicos_anon" on public.ingredientes_receita;
create policy "ingredientes_visualizar_publicos_anon"
  on public.ingredientes_receita for select to anon
  using (
    exists (
      select 1 from public.receitas r
      where r.id = receita_id and r.visibilidade = 'publica'
    )
  );

drop policy if exists "ingredientes_inserir" on public.ingredientes_receita;
create policy "ingredientes_inserir"
  on public.ingredientes_receita for insert to authenticated
  with check (
    exists (
      select 1 from public.receitas r
      where r.id = receita_id and r.usuario_id = (select auth.uid())
    )
  );

drop policy if exists "ingredientes_atualizar" on public.ingredientes_receita;
create policy "ingredientes_atualizar"
  on public.ingredientes_receita for update to authenticated
  using (
    exists (
      select 1 from public.receitas r
      where r.id = receita_id and r.usuario_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.receitas r
      where r.id = receita_id and r.usuario_id = (select auth.uid())
    )
  );

drop policy if exists "ingredientes_excluir" on public.ingredientes_receita;
create policy "ingredientes_excluir"
  on public.ingredientes_receita for delete to authenticated
  using (
    exists (
      select 1 from public.receitas r
      where r.id = receita_id and r.usuario_id = (select auth.uid())
    )
  );


-- Etapas: mesmas regras de acesso dos ingredientes.

drop policy if exists "etapas_visualizar" on public.etapas_receita;
create policy "etapas_visualizar"
  on public.etapas_receita for select to authenticated
  using (
    exists (
      select 1 from public.receitas r
      where r.id = receita_id
        and (r.usuario_id = (select auth.uid()) or r.visibilidade = 'publica')
    )
  );

drop policy if exists "etapas_visualizar_publicas_anon" on public.etapas_receita;
create policy "etapas_visualizar_publicas_anon"
  on public.etapas_receita for select to anon
  using (
    exists (
      select 1 from public.receitas r
      where r.id = receita_id and r.visibilidade = 'publica'
    )
  );

drop policy if exists "etapas_inserir" on public.etapas_receita;
create policy "etapas_inserir"
  on public.etapas_receita for insert to authenticated
  with check (
    exists (
      select 1 from public.receitas r
      where r.id = receita_id and r.usuario_id = (select auth.uid())
    )
  );

drop policy if exists "etapas_atualizar" on public.etapas_receita;
create policy "etapas_atualizar"
  on public.etapas_receita for update to authenticated
  using (
    exists (
      select 1 from public.receitas r
      where r.id = receita_id and r.usuario_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.receitas r
      where r.id = receita_id and r.usuario_id = (select auth.uid())
    )
  );

drop policy if exists "etapas_excluir" on public.etapas_receita;
create policy "etapas_excluir"
  on public.etapas_receita for delete to authenticated
  using (
    exists (
      select 1 from public.receitas r
      where r.id = receita_id and r.usuario_id = (select auth.uid())
    )
  );


-- Favoritos: cada usuário vê e gerencia somente sua lista.
-- Só é possível favoritar receita pública de outra pessoa.

drop policy if exists "favoritos_visualizar_proprios" on public.receitas_favoritas;
create policy "favoritos_visualizar_proprios"
  on public.receitas_favoritas for select to authenticated
  using (usuario_id = (select auth.uid()));

drop policy if exists "favoritos_inserir_proprios" on public.receitas_favoritas;
create policy "favoritos_inserir_proprios"
  on public.receitas_favoritas for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.receitas r
      where r.id = receita_id
        and r.visibilidade = 'publica'
        and r.usuario_id <> (select auth.uid())
    )
  );

drop policy if exists "favoritos_excluir_proprios" on public.receitas_favoritas;
create policy "favoritos_excluir_proprios"
  on public.receitas_favoritas for delete to authenticated
  using (usuario_id = (select auth.uid()));


-- Criação/edição da receita e substituição de ingredientes/etapas em
-- uma transação só. SECURITY INVOKER mantém os grants e a RLS em vigor.
create or replace function public.salvar_receita_com_conteudo(
  p_receita_id uuid,
  p_titulo text,
  p_descricao text,
  p_categoria_id uuid,
  p_tempo_preparo_minutos integer,
  p_rendimento text,
  p_imagem_url text,
  p_observacoes text,
  p_visibilidade text,
  p_ingredientes jsonb,
  p_etapas jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_receita_id uuid;
  v_usuario_id uuid := auth.uid();
begin
  if v_usuario_id is null then
    raise exception 'Autenticação necessária para salvar receitas.' using errcode = '42501';
  end if;

  if p_receita_id is null then
    insert into public.receitas (
      usuario_id, titulo, descricao, categoria_id, tempo_preparo_minutos,
      rendimento, imagem_url, observacoes, visibilidade
    ) values (
      v_usuario_id, p_titulo, p_descricao, p_categoria_id, p_tempo_preparo_minutos,
      p_rendimento, p_imagem_url, p_observacoes, p_visibilidade
    ) returning id into v_receita_id;
  else
    update public.receitas set
      titulo = p_titulo,
      descricao = p_descricao,
      categoria_id = p_categoria_id,
      tempo_preparo_minutos = p_tempo_preparo_minutos,
      rendimento = p_rendimento,
      imagem_url = p_imagem_url,
      observacoes = p_observacoes,
      visibilidade = p_visibilidade
    where id = p_receita_id and usuario_id = v_usuario_id
    returning id into v_receita_id;

    if v_receita_id is null then
      raise exception 'Receita inexistente ou sem permissão para editar.' using errcode = '42501';
    end if;
  end if;

  delete from public.ingredientes_receita where receita_id = v_receita_id;
  delete from public.etapas_receita where receita_id = v_receita_id;

  insert into public.ingredientes_receita (receita_id, nome, quantidade, unidade, ordem)
  select v_receita_id, item.nome, item.quantidade, item.unidade, item.ordem
  from jsonb_to_recordset(coalesce(p_ingredientes, '[]'::jsonb))
    as item(nome text, quantidade text, unidade text, ordem integer);

  insert into public.etapas_receita (receita_id, instrucao, ordem)
  select v_receita_id, item.instrucao, item.ordem
  from jsonb_to_recordset(coalesce(p_etapas, '[]'::jsonb))
    as item(instrucao text, ordem integer);

  return v_receita_id;
end;
$$;


-- ------------------------------------------------------------
-- 9. PERMISSÕES
-- RLS continua sendo a camada que limita quais linhas cada
-- usuário autenticado pode acessar.
-- ------------------------------------------------------------

revoke all on public.categorias_receitas,
              public.receitas,
              public.ingredientes_receita,
              public.etapas_receita,
              public.receitas_favoritas
from anon;

-- Leitura anônima limitada por RLS a conteúdo público. Nenhuma escrita
-- é concedida ao papel anon.
grant usage on schema public to anon, authenticated;
grant select on public.categorias_receitas,
                public.receitas,
                public.ingredientes_receita,
                public.etapas_receita
to anon;

grant select, insert, update, delete
  on public.categorias_receitas,
     public.receitas,
     public.ingredientes_receita,
     public.etapas_receita,
     public.receitas_favoritas
to authenticated;

revoke all on function public.salvar_receita_com_conteudo(
  uuid, text, text, uuid, integer, text, text, text, text, jsonb, jsonb
) from public, anon;
grant execute on function public.salvar_receita_com_conteudo(
  uuid, text, text, uuid, integer, text, text, text, text, jsonb, jsonb
) to authenticated;

commit;

-- ============================================================
-- EXEMPLO DE USO (execute separadamente, após configurar Auth):
--
-- 1) Criar receita:
-- insert into public.receitas (titulo, descricao, tempo_preparo_minutos, rendimento)
-- values ('Bolo de cenoura', 'Bolo simples com cobertura de chocolate', 50, '8 porções')
-- returning id;
--
-- 2) Com o ID retornado, adicionar ingrediente:
-- insert into public.ingredientes_receita (receita_id, nome, quantidade, unidade, ordem)
-- values ('UUID_DA_RECEITA', 'Farinha de trigo', '2', 'xícaras', 1);
--
-- 3) Adicionar etapa:
-- insert into public.etapas_receita (receita_id, instrucao, ordem)
-- values ('UUID_DA_RECEITA', 'Misture os ingredientes secos.', 1);
--
-- Observação: o usuário precisa estar autenticado no Supabase para
-- executar operações protegidas pelas políticas acima.
-- ============================================================
