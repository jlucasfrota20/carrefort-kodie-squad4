# Prompt Log — QA e Privacidade

## Prompt pós-deploy elaborado com apoio de IA

Estou fechando o QA do Carrefort. Use como evidência o ZIP da v1.1.0, os resultados de build e lint, a falha de inicialização do Supabase sem configuração e o reteste da Vercel. Quero definir quais problemas podem atrapalhar a demonstração e o que precisa acontecer para eu marcar cada correção como aprovada.

1. Monte o cenário de ponta a ponta com o produto fictício Arroz QA e o lote QA-001, com 10 UN. Depois do F5, eu preciso encontrar o produto, o lote e o mesmo saldo. Inclua tentativas com nome só de espaços e quantidade fracionária em UN.
2. Confira como eu posso comparar estoque, movimentações e indicadores. Dê atenção aos registros de 03/12 exibidos em 27/11. Indique a evidência necessária para confirmar se eles também entram no total dos últimos sete dias.
3. Proponha um comportamento claro para três situações: configuração ausente, consulta com erro e lista vazia. Dê um critério de aceite observável para cada uma.
4. Mostre o que consigo conferir pela interface e o que depende do Tech Lead, como a chave pública do Supabase e as permissões de leitura e gravação. Considere gravações apenas no ambiente liberado para testes com dados fictícios.

Para cada ocorrência, devolva evidência, impacto, prioridade, ajuste proposto e passo de reteste. Identifique a versão de onde veio a evidência. Antes de sugerir uma mudança na main, confira se o problema ainda existe no código atual.

## Objetivo

Quis usar a abertura do deploy como ponto de partida para verificar o que ainda pode afetar o estoque e a demonstração. Foquei em gravação, saldo, transparência dos erros e permissões.

## Resultado

A revisão confirmou abertura e busca na Vercel. Organizei cadastro e persistência como o próximo teste do fluxo principal. Deixei a validação do nome e as datas futuras como ocorrências a investigar. Para o ambiente local, o critério é abrir com configuração válida e apresentar uma mensagem compreensível se ela faltar.

## Ajuste após conferir as evidências

A primeira resposta da IA tratou a inicialização do Vite como sinal de que o MVP já funcionava. Quando abri o endereço, vi a tela branca. Registrei o início do servidor e a abertura da interface como verificações distintas. Com o reteste da Vercel, atualizei abertura e busca para “Passou”. A gravação, as permissões e o efeito das datas futuras sobre os indicadores ficaram pendentes.
