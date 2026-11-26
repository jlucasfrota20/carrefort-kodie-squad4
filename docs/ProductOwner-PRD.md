# PRD — Carrefort Validade em Dia

**Equipe:** StackUp

**Empresa atendida:** Carrefort

**Escopo inicial:** MVP para Gerenciamento de Estoque

## 1. Visão geral

O Carrefort é uma aplicação para apoiar o controle de produtos próximos do vencimento. O sistema permite que a equipe registre produtos, acompanhe alertas de validade, publique ofertas de última hora e registre a destinação dos itens como vendidos, doados ou descartados.

Clientes poderão consultar as ofertas publicadas sem criar uma conta. O MVP busca facilitar a ação da equipe antes do vencimento e gerar dados que permitam avaliar o efeito do processo sobre o desperdício.

## 2. Problemática

A rede Carrefort possui 40 lojas. O controle de validade é feito em planilhas impressas, e a conferência ocorre, entre outras atividades, no fim do turno. Produtos de padaria, frios e hortifrúti podem passar da validade sem que a equipe tenha tempo ou informação suficiente para agir, resultando em perdas e descarte.

O processo atual também dificulta consolidar, por loja e categoria, informações sobre os itens identificados, ofertados e destinados. A frequência e o volume dessas perdas ainda devem ser medidos durante o levantamento e o piloto; este PRD não presume valores de desperdício.

<br>

### Identificação do Problema

Gerentes de setor precisam identificar e tratar produtos próximos do vencimento de forma simples e oportuna. O controle manual atual pode dificultar a identificação consistente desses itens e a oferta deles aos clientes antes do vencimento.

## 3. Usuários e personas

### 3.1 Administrador | Equipe da loja ⚙️

**Persona de referência:** Dona Célia, gerente de setor.

- Confere a validade dos produtos ao fim do turno.
- Precisa localizar rapidamente os produtos que exigem atenção.
- Precisa registrar ofertas e informar o destino final dos produtos.
- Necessita de uma interface simples, adequada à rotina operacional da loja.

O acesso administrativo será autenticado. O perfil e as permissões exatas da equipe deverão ser validados com a operação.

### 3.2 Cliente 🧑

**Persona de referência:** Genérico.

Pessoa que procura economia e deseja consultar produtos em oferta de última hora. No MVP, pelo menos, poderá acessar a vitrine sem cadastro e sem fornecer dados pessoais para apenas visualizar as ofertas.

## 4. Objetivos e critérios de sucesso

### 4.1 Objetivos do MVP

1. Centralizar o cadastro de produtos.
2. Sinalizar os produtos que requerem atenção.
3. Permitir que a equipe publique ofertas de última hora para consulta pelos clientes.
4. Registrar a quantidade vendida, doada ou descartada por produto.
5. Coletar dados para avaliar a variação do desperdício durante o piloto.

### 4.2 Funcionalidades essenciais / Páginas

***
**Funcionalidades essenciais:**
- Login: adm ou cliente (sem cadastro)
- Gerenciamento de Estoque (cadastro de produtos) + Separação: Vendido, Doado e Descartado
- Painel de alerta com divisão de prazos
- Painel de ofertas de ultima hora para clientes

***
**Páginas propostas:**

- Landing Page
- Página de Login
- Página de Gerenciamento de Estoque
- Painel de alerta com divisão de prazos
- Painel de ofertas de última hora para clientes

## 5. Solução proposta

A aplicação terá uma área administrativa protegida por login e uma vitrine pública de ofertas. A equipe poderá cadastrar produtos, acompanhar alertas, publicar ofertas e registrar a destinação dos itens. O cliente poderá consultar as ofertas disponíveis sem cadastro.

### Fluxo principal

1. A equipe autenticada cadastra um produto e registra um produto com loja, quantidade e validade.
2. O sistema classifica os produtos em alertas por prazo.
3. A equipe avalia os itens e, quando aplicável, publica uma oferta.
4. O cliente consulta a vitrine de ofertas disponíveis.
5. A equipe registra as quantidades vendidas, doadas ou descartadas.
6. O saldo do lote é atualizado conforme as movimentações registradas.

## 6. Requisitos funcionais

- **RF-01 — Acesso:** administradores autenticados gerenciam o sistema; clientes consultam a vitrine pública sem cadastro.
- **RF-02 — Produtos e lotes:** a equipe cadastra produtos, informando quantidade, unidade e validade; o sistema mantém o saldo disponível.
- **RF-03 — Destinação:** a equipe registra quantidades vendidas, doadas ou descartadas por lote; o saldo é atualizado e não pode ficar negativo.
- **RF-04 — Alertas:** o sistema agrupa lotes disponíveis por validade: vence hoje, em até 2 dias, em até 5 dias e vencidos, em grupo separado.
- **RF-05 — Ofertas:** a equipe publica ou encerra ofertas de lotes elegíveis; clientes veem ofertas vigentes na vitrine. Itens vencidos, encerrados ou sem saldo não são exibidos. Compra e pagamento não fazem parte do MVP.

## 7. Requisitos não funcionais

- A interface deverá ser responsiva e adequada ao uso em computador, tablet e celular.
- As funções administrativas deverão exigir autenticação e autorização apropriadas.
- Os dados administrativos não deverão ser expostos pela vitrine pública.
- O sistema deverá validar quantidades, datas e movimentações para reduzir inconsistências de estoque.
- Os registros deverão permitir identificar a loja, o lote, o tipo de movimentação e a data correspondente.
- A coleta de dados de clientes deverá ser evitada no MVP, pois não é necessária para a consulta pública de ofertas.

## 8. Fora do escopo do MVP

- **Cadastro ou login de clientes:** não é necessário para consultar a vitrine e aumentaria a quantidade de dados pessoais tratados.
- **Compra, reserva ou pagamento on-line:** a primeira versão apenas apresenta ofertas; a venda ocorre nos processos existentes da loja.

## 9. Histórico e aprovação

| Versão | Alteração | Status |
|--------|-----------|--------|
| 1 | Criação do PRD-base para validação do escopo do MVP | Revisado |

**Responsáveis pela validação:** Product Owner, representantes da operação das lojas e equipe de desenvolvimento.