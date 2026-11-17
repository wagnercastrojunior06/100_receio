# Design System --- 100 Receio

**Versão:** 1.0\
**Produto:** site simples para criar, personalizar, organizar e salvar
receitas\
**Direção visual:** acolhedora, leve, caseira e contemporânea

------------------------------------------------------------------------

## 1. Visão do produto

O site deve parecer um caderno de receitas digital: simples de entender,
agradável de usar e organizado para que cada pessoa possa registrar suas
próprias receitas.

A experiência principal é permitir que o usuário:

-   Crie uma receita usando campos de texto claros.
-   Informe ingredientes, quantidades, modo de preparo e observações.
-   Salve a receita para consultar depois.
-   Edite e personalize receitas que criou.
-   Encontre receitas salvas sem navegar por menus complexos.

**Princípio central:** a interface deve deixar a receita --- e não a
decoração --- em primeiro plano. Evite aparência de painel
administrativo, excesso de cores, efeitos chamativos ou funcionalidades
que compliquem o cadastro.

## 2. Personalidade visual

Palavras-chave:

-   Acolhedora
-   Caseira
-   Fresca
-   Simples
-   Organizada
-   Artesanal, sem parecer antiga

Use superfícies claras, tons inspirados em ingredientes naturais e
pequenos detalhes de cor. Fotos de comida podem aparecer nas capas dos
cartões, mas a interface deve continuar bonita e funcional mesmo quando
uma receita não tiver imagem.

## 3. Cores e tokens

A paleta deve ser suave e ter contraste suficiente para leitura.

  -------------------------------------------------------------------------
  Token                     Cor                     Uso
  ------------------------- ----------------------- -----------------------
  `--color-primary`         `#527A59`               Ações principais, links
                                                    ativos e destaques

  `--color-primary-hover`   `#416448`               Hover de ações
                                                    principais

  `--color-primary-soft`    `#EAF1E8`               Fundos suaves e
                                                    seleções

  `--color-accent`          `#D98B45`               Pequenos destaques,
                                                    etiquetas e detalhes

  `--color-accent-soft`     `#F8EDE0`               Fundos de etiquetas

  `--color-bg`              `#FAF9F6`               Fundo geral da página

  `--color-surface`         `#FFFFFF`               Cartões, caixas e
                                                    formulários

  `--color-text`            `#292D28`               Texto principal

  `--color-text-muted`      `#73796F`               Texto auxiliar e
                                                    descrições

  `--color-border`          `#E6E5DE`               Bordas e divisórias

  `--color-danger`          `#B84C43`               Erros e exclusões

  `--color-success`         `#527A59`               Confirmações e
                                                    salvamento
  -------------------------------------------------------------------------

### Regras de uso

-   Verde é a cor principal de ação; não use verde em todos os
    elementos.
-   Laranja deve ser usado como acento, não como cor dominante.
-   Mantenha fundos neutros e cartões brancos.
-   Não use texto claro sobre fundos claros.
-   Não dependa apenas da cor para indicar erro, sucesso ou seleção.

## 4. Tipografia

Use uma combinação legível e amigável:

-   **Títulos:** `Lora`, com alternativa `Georgia`, para um toque
    editorial de livro de receitas.
-   **Interface e textos:** `Inter`, com alternativa `Arial`, para
    leitura confortável em botões, formulários e navegação.

Escala sugerida:

  Elemento              Tamanho desktop   Peso
  ------------------- ----------------- ------
  Título da página            32--36 px    700
  Título de seção             22--26 px    600
  Título de receita           18--20 px    600
  Texto normal                    16 px    400
  Texto auxiliar                  14 px    400
  Etiqueta                    12--13 px    600

Use altura de linha entre 1.45 e 1.7 para textos longos e instruções de
preparo.

## 5. Layout e espaçamento

-   Largura máxima do conteúdo: `1120px`.
-   Margens laterais generosas em telas grandes.
-   Em dispositivos móveis, usar 16--20 px de margem.
-   Espaçamento baseado em múltiplos de 4 px.
-   Separar seções com espaço, não com muitas linhas e caixas.
-   Usar cantos arredondados moderados: 10--16 px.
-   Sombras discretas; priorizar bordas leves.

Tokens sugeridos:

``` css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-pill: 999px;

  --content-width: 1120px;
  --shadow-card: 0 4px 18px rgba(41, 45, 40, 0.06);
}
```

## 6. Estrutura de navegação

Mantenha a navegação curta. Sugestão:

-   **Início:** apresentação breve e receitas recentes ou favoritas.
-   **Minhas receitas:** coleção de receitas criadas pelo usuário.
-   **Nova receita:** acesso direto ao formulário de criação.

Em telas pequenas, use uma barra superior simples ou navegação compacta.
A ação "Nova receita" deve continuar fácil de encontrar.

Não crie sidebar de dashboard para este produto, a menos que o projeto
venha a ter muitas áreas e funcionalidades.

## 7. Componentes da interface

### 7.1 Botões

Variantes:

-   **Primário:** fundo verde, texto branco. Usar para "Salvar receita"
    e "Criar receita".
-   **Secundário:** fundo branco, borda neutra e texto escuro. Usar para
    "Cancelar" e "Voltar".
-   **Texto:** sem fundo, para ações discretas como "Editar".
-   **Perigo:** vermelho discreto para "Excluir receita".

Estados obrigatórios: padrão, hover, foco por teclado, pressionado e
desabilitado.

Texto dos botões deve ser direto e orientado à ação. Evite rótulos vagos
como "Enviar" quando "Salvar receita" for mais claro.

### 7.2 Campos de texto

Campos devem ter:

-   Rótulo visível acima do campo.
-   Placeholder apenas como exemplo, nunca como substituto do rótulo.
-   Borda neutra e fundo branco.
-   Estado de foco com contorno verde visível.
-   Mensagem de erro próxima ao campo.
-   Altura confortável para toque em celular.

Campos sugeridos para a receita:

1.  Nome da receita.
2.  Pequena descrição (opcional).
3.  Tempo de preparo.
4.  Rendimento ou porções.
5.  Ingredientes.
6.  Modo de preparo.
7.  Observações pessoais (opcional).
8.  Categoria ou etiquetas (opcional).
9.  Imagem (opcional, se o projeto suportar).

### 7.3 Editor de ingredientes

Cada ingrediente deve ser inserido em uma linha própria, com campos
simples:

-   Quantidade (ex.: `2`)
-   Unidade (ex.: `xícaras`)
-   Ingrediente (ex.: `farinha de trigo`)

Ofereça botão "Adicionar ingrediente" e uma ação clara para remover uma
linha. Permita que o usuário escreva quantidades livres quando medidas
não convencionais forem necessárias.

### 7.4 Editor do modo de preparo

-   Cada etapa deve ocupar um campo de texto separado.
-   Numerar as etapas automaticamente na apresentação.
-   Oferecer "Adicionar etapa".
-   Permitir editar, remover e reorganizar etapas, se isso for viável na
    implementação.
-   Não limitar desnecessariamente o tamanho do texto.

### 7.5 Cartão de receita

Cada cartão pode mostrar:

-   Foto opcional.
-   Nome da receita.
-   Descrição curta, se houver.
-   Tempo de preparo, se informado.
-   Etiqueta de categoria, se houver.
-   Ação para abrir a receita.
-   Ação de favoritar, se o recurso existir.

O cartão deve ter hierarquia clara e não deve ficar cheio de botões. A
edição e a exclusão podem ficar na página de detalhes ou em um menu
discreto.

### 7.6 Etiquetas

Use etiquetas pequenas e suaves para categorias como "Doce", "Salgado",
"Almoço" e "Sobremesa". Não atribua categorias automaticamente sem
permitir correção pelo usuário.

### 7.7 Avisos e confirmações

-   Ao salvar: mostrar confirmação breve, por exemplo, "Receita salva".
-   Ao ocorrer erro: explicar o que precisa ser corrigido.
-   Ao excluir: pedir confirmação antes de remover.
-   Ao sair com alterações não salvas: avisar que há mudanças pendentes,
    quando tecnicamente possível.

## 8. Páginas e estados

### Início

-   Boas-vindas curtas.
-   Botão de destaque "Nova receita".
-   Acesso às receitas recentes ou favoritas.
-   Sem excesso de blocos promocionais.

### Minhas receitas

-   Título claro.
-   Campo de busca por nome.
-   Filtro simples por categoria, se houver categorias.
-   Grade de cartões responsiva.
-   Estado vazio com convite para criar a primeira receita.

Texto sugerido para estado vazio:

> Seu caderno ainda está vazio. Que tal salvar sua primeira receita?

### Criar ou editar receita

-   Formulário dividido em seções fáceis de percorrer.
-   Campos com rótulos claros.
-   Ingredientes e etapas em listas editáveis.
-   Ações "Salvar receita" e "Cancelar".
-   Em edição, preencher os campos com os dados existentes.
-   Distinguir visualmente criação de edição sem mudar a estrutura
    inteira da página.

### Detalhes da receita

-   Nome e descrição.
-   Ingredientes em lista.
-   Modo de preparo numerado.
-   Tempo e rendimento, quando informados.
-   Observações pessoais.
-   Ações "Editar" e "Excluir".

## 9. Comportamento e experiência

-   O usuário deve conseguir salvar uma receita sem preencher campos
    opcionais.
-   Validar apenas o necessário: por exemplo, nome da receita e conteúdo
    mínimo definido pelo produto.
-   Preservar os dados ao editar.
-   Pedir confirmação antes de excluir.
-   Exibir feedback após salvar, editar ou excluir.
-   Evitar perder o conteúdo digitado por causa de um erro de validação.
-   Se o projeto ainda não tiver backend, usar o mecanismo de
    persistência já existente. Se não houver nenhum, propor
    `localStorage` como solução inicial e explicar que os dados ficarão
    apenas naquele navegador/dispositivo.
-   Não afirmar que os dados estão sincronizados entre dispositivos sem
    backend e autenticação.

## 10. Responsividade

### Desktop

-   Conteúdo centralizado.
-   Grade de receitas com 3 colunas, se houver espaço.
-   Formulário com largura confortável, sem campos excessivamente
    largos.
-   Ações principais visíveis.

### Tablet

-   Grade com 2 colunas.
-   Reduzir margens e espaçamentos.
-   Manter botões e campos confortáveis para toque.

### Celular

-   Grade com 1 coluna.
-   Formulário em coluna única.
-   Botões principais com área de toque de pelo menos 44 × 44 px.
-   Evitar menus horizontais que precisem de rolagem.
-   Não permitir que textos, botões ou cartões ultrapassem a largura da
    tela.

## 11. Acessibilidade

-   Usar HTML semântico (`header`, `nav`, `main`, `section`, `form`,
    `label`, `button`).
-   Associar cada `label` ao seu campo.
-   Garantir navegação por teclado e foco visível.
-   Usar contraste adequado entre texto e fundo.
-   Não comunicar estados somente por cor.
-   Adicionar texto alternativo descritivo às imagens relevantes.
-   Usar botões reais para ações e links reais para navegação.
-   Informar erros de formulário de forma textual e acessível.

## 12. Diretrizes de implementação

-   Manter HTML, CSS e JavaScript puro, respeitando a arquitetura já
    existente.
-   Criar tokens CSS em um único lugar e reutilizá-los.
-   Preferir classes reutilizáveis, como `.button`, `.recipe-card`,
    `.form-field` e `.tag`.
-   Evitar estilos inline repetidos.
-   Separar estrutura, aparência e comportamento.
-   Não adicionar bibliotecas pesadas sem necessidade.
-   Não introduzir React, Vue, Angular ou outro framework.
-   Não reescrever funcionalidades existentes sem justificativa.
-   Não inventar funcionalidades que não foram solicitadas.

## 13. Critérios de qualidade

Antes de considerar o trabalho concluído, verificar:

-   A interface mantém a mesma identidade em todas as páginas.
-   Criar, salvar, abrir e editar uma receita funciona.
-   Ingredientes e etapas podem ser adicionados e removidos.
-   A exclusão tem confirmação.
-   Campos e botões funcionam com mouse, teclado e toque.
-   A interface funciona em celular, tablet e desktop.
-   Estados vazios, erros e confirmações estão tratados.
-   Não há erros no console do navegador.
-   Os dados não são apresentados como sincronizados se não houver
    infraestrutura para isso.

------------------------------------------------------------------------

## 14. Instrução curta para o Codex

Leia este `DESIGN.md` antes de alterar a interface. Analise a estrutura
atual do projeto e implemente o sistema visual descrito, respeitando
HTML, CSS e JavaScript puro. Preserve funcionalidades e dados
existentes. Comece apresentando um plano curto; depois implemente os
componentes e páginas necessários, valide a responsividade e teste os
fluxos de criar, salvar, visualizar e editar receitas. Não invente
funcionalidades nem apague arquivos sem necessidade.
