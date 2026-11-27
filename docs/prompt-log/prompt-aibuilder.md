# Prompt Log — Carrefort

Registro dos marcos de desenvolvimento realizados em conjunto, com programação colaborativa, organização das funcionalidades e apoio na tomada de decisões técnicas.

## Marco 1 — Sistema de Estoque v1.0.0

**Objetivo:** construir a primeira versão funcional do módulo de gerenciamento de estoque do Carrefort.

### Desenvolvimento em conjunto

- Planejamento e organização da estrutura inicial do módulo de estoque.
- Desenvolvimento da interface em React e organização dos componentes e arquivos do projeto.
- Integração da aplicação com o Supabase.
- Implementação do cadastro, consulta e edição de produtos.
- Implementação do cadastro e edição de lotes, vinculados aos produtos.
- Organização do controle de quantidade, unidade de medida e validade dos lotes.
- Implementação de filtros e pesquisa para facilitar a consulta de produtos e lotes.
- Estruturação da visualização das movimentações: vendido, doado e descartado.
- Ajustes de interface e resolução de problemas durante a implementação.
- Apoio na organização das funcionalidades e nas decisões sobre a estrutura do sistema e do banco de dados.

### Entrega

- Primeira versão funcional do módulo de estoque.
- Código versionado com o commit `feat: modulo de estoque v1.0.0`.
- Tag Git criada: `v1.0.0`.

## Marco 2 — Painel Administrativo v1.1.0

**Objetivo:** ampliar o sistema com um painel administrativo para facilitar o acompanhamento do estoque e das validades.

### Desenvolvimento em conjunto

- Criação do painel com indicadores de estoque e produtos.
- Implementação dos alertas de validade: vencidos, vencem hoje, em até 2 dias e em até 5 dias.
- Exibição das ofertas ativas e das movimentações recentes.
- Implementação dos indicadores de produtos vendidos, doados, descartados e recuperados.
- Organização da navegação lateral e das telas administrativas.
- Ajustes visuais e correções durante o desenvolvimento.

### Entrega

- Painel administrativo integrado ao Supabase.
- Código versionado com o commit da versão `v1.1.0`.

## Marco 3 — Gestão de Ofertas e Vitrine Pública

**Objetivo:** permitir a divulgação de produtos próximos do vencimento para incentivar seu aproveitamento.

### Desenvolvimento em conjunto

- Implementação do gerenciamento de ofertas.
- Criação da vitrine pública de ofertas de última hora.
- Integração das ofertas com os lotes cadastrados.
- Exibição dos produtos disponíveis e suas respectivas validades.
- Ajustes de responsividade e interface.

### Entrega

- Vitrine pública integrada aos dados do Supabase.
- Funcionalidades do MVP implementadas e integradas.