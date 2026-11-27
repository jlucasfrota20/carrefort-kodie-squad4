# QA e Privacidade — Carrefort Squad 4

**Revisão em 27/11/2026** • Tag local `v1.1.0` (`42e7499`) e MVP na Vercel

## O que eu verifiquei

Comecei pela abertura no meu PC. O Vite iniciou normalmente, mas o Opera mostrou uma página em branco. Na revisão com apoio de IA, o build da tag passou e o lint apontou quatro erros. O reteste com o `vite.config.js` do Herick confirmou a base local `/` e o prefixo `/carrefort-kodie-squad4/` no build. Ao carregar isoladamente o módulo do Supabase sem configuração, a revisão reproduziu `supabaseUrl is required.`. Ainda falta comparar esse erro com o Console do meu PC.

Depois que a equipe mandou o [link da Vercel](https://carrefort-kodie-squad4.vercel.app/), conferi os resultados do reteste. A Visão geral abriu por HTTPS e carregou os indicadores, incluindo 40 produtos. Na tela Produtos, a busca por `Pão francês` retornou o item.

## Registro de ocorrências

| ID | Evidência e impacto | Como eu fecharia |
|---|---|---|
| QA-01 — Tela branca local | Observei a tela branca. A revisão reproduziu, separadamente, a falha de inicialização sem a URL do Supabase. Isso bloqueia a abertura quando a configuração está ausente. | Conferir o Console local. Documentar as variáveis em um `.env.example` sem valores reais. Retestar com configuração válida e verificar se a falta dela gera uma mensagem clara. |
| QA-02 — Lint | Quatro erros na tag. Atualizações de estado em efeitos em `App.jsx:199` e `GerenciamentoProdutos.jsx:102` e `:162`, além de variável sem uso em `:465`. | Conferir se a versão atual ainda apresenta esses erros. Após o ajuste, rodar o lint e retestar carregamento e navegação. |
| QA-03 — Nome só com espaços | Na tag, o formulário aplica `trim()` sem revalidar o valor nesse ponto do envio. O comportamento do banco ainda precisa ser confirmado. | Tentar cadastrar um nome só com espaços no ambiente de teste. O formulário deve indicar o problema e impedir a gravação. |
| QA-04 — Datas futuras no painel | Em 27/11, o painel publicado mostrou movimentações de 03/12 em “Movimentações recentes”. Registrei como ponto a investigar. | Confirmar a regra e os dados de demonstração. Movimentações futuras devem ficar fora de qualquer indicador rotulado “últimos 7 dias”. Ainda falta conferir se entram no total. |

## Plano de testes

| Teste | Procedimento e resultado esperado | Situação |
|---|---|---|
| Abertura e leitura | Abrir a Vercel e aguardar os indicadores. A Visão geral carregou e mostrou 40 produtos. | Passou |
| Busca | Em Produtos, buscar `Pão francês`. O item apareceu. | Passou |
| Cadastro e persistência | No ambiente liberado pela equipe, cadastrar `Arroz QA` e o lote `QA-001`, com 10 UN e validade futura. Recarregar, buscar o produto e conferir lote e saldo. | Pendente |
| Validação | Tentar salvar nome vazio ou só com espaços e lote sem produto, sem validade, com quantidade zero ou fracionária em UN. Esperar bloqueio sem gravação. | Pendente |
| Filtros e saldo | Comparar filtros de validade e saldo com lotes e saídas fictícias de venda, doação e descarte. As quantidades devem bater com os registros. | Pendente |
| Celular e teclado | Usar o painel e os formulários em tela pequena. Percorrer os controles com Tab e conferir se o foco aparece. | Pendente |

## Segurança e privacidade

- [x] Revisei os campos de produto e lote e confirmei que o ZIP da tag não contém `.env`.
- [x] O MVP abriu por HTTPS na Vercel.
- [ ] Confirmar com o Tech Lead que o frontend usa somente uma chave pública do Supabase e que as políticas de acesso por linha (RLS) limitam leitura e gravação conforme o uso do MVP.
- [ ] Usar somente dados fictícios nos testes de gravação e nas evidências compartilhadas.

## Meu parecer

A abertura, a leitura dos indicadores e a busca passaram na Vercel. Para fechar o fluxo de estoque, falta cadastrar produto e lote, recarregar e confirmar que os registros e o saldo continuam disponíveis. Também deixei registrada a checagem das datas futuras para a equipe conferir a regra do painel.
