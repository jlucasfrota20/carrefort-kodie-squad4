# PRODUCT OWNER - JOÃO LUCAS FROTA AGUIAR
#### **Documento:** PROMPT LOG
#### **Ferramenta utilizada:** GitHub Copilot integrada ao VS CODE

### 1 - Prompt de Entendimento Inicial para explicação sobre o assunto
```
O que é um PRD? Como funciona e para que serve? Quais atenções preciso ter na hora da montagem?
```
R: Instruiu o funcionamento de um PRD.

<br>

### 2 - Prompt de Contextualização para preparação da IA e gerar entendimento do trabalho
```
# A situação do PRD está contextualizada na formação de um MVP para a resolução do problema de desperdício de alimentos próximos do vencimento. Com isso planeje as etapas da montagem do MVP.

Carrefort (Supermercados): Reduzir desperdício de alimentos próximos do vencimento. A rede tem 40 lojas e perde produtos de padaria, frios e hortifrúti porque o controle de validade é feito em planilha impressa.

-> Persona: Dona Célia, gerente de setor, que confere validade no fim do turno; e o cliente que busca economia.
-> O MVP precisa: cadastrar lotes com data de validade; mostrar um painel de alertas por prazo (vence hoje, em 2 dias, em 5 dias); publicar uma vitrine de "Ofertas da Última Hora" para clientes; registrar o que foi vendido, doado ou descartado.
-> IA no produto (opcional): sugerir uma receita ou um combo com os itens em oferta do dia.
-> Pergunta do cliente no pitch: "Quanto desperdício isso evita por semana em uma loja?"
```
R: Respondeu com um resumo e meio planejamento do projeto.

<br>

### 3 - Prompt para planejamento do PRD Base Model
```
# Agora com esse escopo, planeje a elaboração dessas partições do PRD

1 - Registrar nome do produto e empresa atendida.
2 - Descrever problema e persona.
3 - Explicar a solução proposta.
4 - Listar as funcionalidades prioritárias.
5 - Registrar o que ficará fora do escopo e o motivo.
```
R: Formalizou o planejamento de como poderia ser o documento, a partir da divisão de categorias como: Introdução, Contexto, Concordâncias, Funcionalidades...

<br>

### 4 - Prompt de criação para formação do Modelo Base do PRD
```
Agora com tudo planejado, faça o modelo base de um PRD para esta aplicação seguindo devida organização e formalidade na linguagem. Lembre-se que as funcionalidades organizadas pela equipe são:

1 - Login: adm ou cliente (cliente sem cadastro).
2 - Painel de Gerenciamento de Estoque (cadastro de produtos) + Separação: Vendido, Doado e Descartado.
3 - Painel de alerta com divisão de prazos.
4 - Painel de ofertas de ultima hora para clientes.
```
R: Formatou o projeto do documento seguindo o planejamento anterior.

<br>

### 5 - Prompt para revisão de informações, pendências, ortografia e formalidade
```
Analise a disposição final do arquivo, editada por mim, e faça verificação ortográfica e sintática, sem alterar nenhum sentido ou repasse de informações. Verifique se há também alguma informação pendente importante para o PRD.
```
R: Corrigiu algumas partições do documento.