# 100 Receio

Caderno de receitas em HTML semântico, CSS e JavaScript Vanilla com módulos ES, Supabase Auth/Database, SweetAlert2 e Lucide Icons. O site é estático e pode ser publicado no GitHub Pages. O servidor Node.js incluído serve apenas para desenvolvimento local.

## Requisitos

- Node.js 18 ou superior e npm para executar localmente.
- Um projeto Supabase para autenticação e persistência.

## Configurar o Supabase

1. No painel Supabase, execute `supabase/schema.sql` pelo SQL Editor. O schema define receitas, categorias, ingredientes, etapas e favoritos com RLS. Este projeto não altera tabelas nem políticas.
2. Obtenha a URL do projeto e a chave pública `anon`/publishable em **Project Settings → API**.
3. Edite `js/config.js` e preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

`js/config.js` é enviado ao navegador e ficará público no repositório e no site. Use somente a URL pública e a chave anon/publishable; nunca coloque uma chave `service_role`, `sb_secret_*` ou outra credencial privilegiada nesse arquivo. O frontend usa as políticas RLS existentes para autorizar operações.

No Supabase, em **Authentication → URL Configuration**, configure a URL principal do site e permita os redirecionamentos usados para confirmação de cadastro e recuperação de senha. Para Pages de projeto, a origem será `https://<usuario>.github.io` e o redirect é `https://<usuario>.github.io/100-receio/` (mais o redirect da recuperação, `https://<usuario>.github.io/100-receio/?view=auth&mode=new-password`). Inclua também `http://127.0.0.1:4173/` para desenvolvimento local.

## Executar localmente

Na raiz do repositório, configure primeiro `js/config.js` como descrito acima e execute:

```powershell
npm.cmd install
npm.cmd run dev
```

Abra `http://127.0.0.1:4173/`. O servidor local Node.js entrega os mesmos arquivos estáticos, incluindo `js/config.js`; não há geração de configuração em tempo de execução. Encerre com `Ctrl+C`.

## Publicar no GitHub Pages

1. Envie o repositório ao GitHub (a disponibilidade do Pages para repositórios privados depende do plano/organização).
2. Confirme que `js/config.js` contém apenas a URL do Supabase e sua chave pública anon/publishable. Esse arquivo fará parte do site público.
3. No repositório, abra **Settings → Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**, escolha a branch desejada e a pasta `/ (root)`, e salve.
5. Aguarde a publicação indicada pelo GitHub Pages. O endereço de um repositório chamado `100-receio` seguirá o padrão `https://<usuario>.github.io/100-receio/`.
6. Adicione os URLs de produção indicados acima em **Supabase → Authentication → URL Configuration**.

O projeto usa caminhos relativos para CSS, JavaScript e navegação, então também funciona na raiz local e no subdiretório do Pages. O aplicativo mantém suas telas em `index.html` e usa parâmetros de query (`?view=...`), permitindo abrir diretamente as telas sem uma regra de fallback de SPA. Não é necessário configurar Render, Node.js de produção, variáveis secretas de build ou Actions.

## Funcionalidades

- Página inicial com receitas públicas, busca e filtro por categoria.
- Cadastro, login, logout e recuperação de senha via Supabase Auth.
- Receitas próprias, formulário de criação/edição, detalhes e exclusão confirmada.
- Ingredientes e etapas de preparo em listas editáveis e ordenadas.
- Favoritos de receitas públicas de outras pessoas e compartilhamento de links públicos.
- Estados vazios, de carregamento, sucesso e erro em português; layout responsivo e acessível.

## Limitações

- Imagens são informadas por URL; upload de arquivos não está implementado.
- Supabase JS, SweetAlert2, Lucide e fontes são carregados por CDN; o navegador precisa de internet.
- O frontend é público: a chave anon/publishable não é um segredo e a segurança dos dados depende das políticas RLS já configuradas no Supabase.
- GitHub Pages serve somente arquivos estáticos; não executa `server.js` nem oferece endpoints de backend. Funções que exigissem segredo ou lógica privilegiada no servidor precisariam de um backend separado.
