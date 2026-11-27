# Tech Lead — Data Model | Carrefort

## Objetivo

Definir a estrutura de dados do Carrefort, organizando as informações necessárias para controlar produtos, lotes, movimentações e ofertas.

## Entidades e campos

### 1. Categories — Categorias

- `id`: identificador da categoria.
- `name`: nome da categoria.

### 2. Products — Produtos

- `id`: identificador do produto.
- `name`: nome do produto.
- `category_id`: referência à categoria.
- `brand`: marca.
- `barcode`: código de barras.
- `description`: descrição.
- `unit`: unidade de medida (UN, KG ou L).
- `created_at`: data de cadastro.

### 3. Lots — Lotes

- `id`: identificador do lote.
- `product_id`: referência ao produto.
- `lot_code`: código do lote.
- `quantity_received`: quantidade recebida.
- `expiration_date`: data de validade.
- `created_at`: data de cadastro.

### 4. Stock Movements — Movimentações

- `id`: identificador da movimentação.
- `lot_id`: referência ao lote.
- `movement_type`: tipo de movimentação (VENDIDO, DOADO ou DESCARTADO).
- `quantity`: quantidade movimentada.
- `notes`: observações.
- `created_at`: data da movimentação.

### 5. Offers — Ofertas

- `id`: identificador da oferta.
- `lot_id`: referência ao lote.
- `is_active`: indica se a oferta está ativa.
- `created_at`: data de criação.

## Relacionamentos

- Uma categoria pode possuir vários produtos.
- Um produto pode possuir vários lotes.
- Um lote pode possuir várias movimentações.
- Um lote pode estar associado a uma oferta.

## Regras importantes

- O estoque disponível é calculado pela quantidade recebida menos as quantidades vendidas, doadas e descartadas.
- As ofertas estão vinculadas aos lotes.
- Produtos vencidos não podem ser vendidos ou doados pelo sistema; devem ser registrados como descartados.

## Banco de dados

O projeto utiliza Supabase com PostgreSQL para armazenar e consultar os dados.