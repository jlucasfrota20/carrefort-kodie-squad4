
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import "./Alertas.css";

function getDaysUntilExpiration(date) {
  const [year, month, day] = date.split("-").map(Number);
  const expiration = new Date(year, month - 1, day);
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return Math.round(
    (expiration.getTime() - today.getTime()) / 86400000
  );
}

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatQuantity(value, unit) {
  return `${Number(value).toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  })} ${unit || "UN"}`;
}

function getExpirationLabel(days) {
  if (days < 0) {
    return `Vencido há ${Math.abs(days)} dia(s)`;
  }

  if (days === 0) return "Vence hoje";
  if (days === 1) return "Vence amanhã";

  return `Vence em ${days} dias`;
}

function Alertas({ onNavigate }) {
  const [products, setProducts] = useState([]);
  const [lots, setLots] = useState([]);
  const [movements, setMovements] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Busca os dados do Supabase
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [
      productsResult,
      lotsResult,
      movementsResult,
      categoriesResult,
    ] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, brand, barcode, category_id, unit")
        .order("name"),

      supabase
        .from("lots")
        .select("id, product_id, lot_code, quantity_received, expiration_date")
        .order("expiration_date"),

      supabase
        .from("stock_movements")
        .select("id, lot_id, movement_type, quantity"),

      supabase
        .from("categories")
        .select("id, name")
        .order("name"),
    ]);

    const errors = [
      productsResult.error,
      lotsResult.error,
      movementsResult.error,
      categoriesResult.error,
    ].filter(Boolean);

    if (errors.length) {
      console.error("Erro ao carregar alertas:", errors);
      setError("Não foi possível carregar os alertas.");
    }

    setProducts(productsResult.data || []);
    setLots(lotsResult.data || []);
    setMovements(movementsResult.data || []);
    setCategories(categoriesResult.data || []);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calcula o saldo e a validade de cada lote
  const alertLots = useMemo(() => {
    return lots
      .map((lot) => {
        const product = products.find(
          (item) => item.id === lot.product_id
        );

        const lotMovements = movements.filter(
          (movement) =>
            movement.lot_id === lot.id &&
            ["VENDIDO", "DOADO", "DESCARTADO"].includes(
              movement.movement_type
            )
        );

        const totalMoved = lotMovements.reduce(
          (total, movement) =>
            total + Number(movement.quantity),
          0
        );

        const available = Math.max(
          0,
          Number(lot.quantity_received) - totalMoved
        );

        return {
          ...lot,
          product,
          available,
          daysUntilExpiration: getDaysUntilExpiration(
            lot.expiration_date
          ),
        };
      })
      .filter(
        (lot) =>
          lot.product &&
          lot.available > 0 &&
          lot.daysUntilExpiration <= 5
      )
      .sort(
        (a, b) =>
          a.daysUntilExpiration - b.daysUntilExpiration
      );
  }, [lots, products, movements]);

  // Indicadores por prazo
  const counts = useMemo(() => ({
    expired: alertLots.filter(
      (lot) => lot.daysUntilExpiration < 0
    ).length,

    today: alertLots.filter(
      (lot) => lot.daysUntilExpiration === 0
    ).length,

    twoDays: alertLots.filter(
      (lot) =>
        lot.daysUntilExpiration >= 1 &&
        lot.daysUntilExpiration <= 2
    ).length,

    fiveDays: alertLots.filter(
      (lot) =>
        lot.daysUntilExpiration >= 3 &&
        lot.daysUntilExpiration <= 5
    ).length,
  }), [alertLots]);

  // Pesquisa e filtros
  const filteredLots = useMemo(() => {
    const query = search.trim().toLowerCase();

    return alertLots.filter((lot) => {
      const category = categories.find(
        (item) => item.id === lot.product.category_id
      );

      const matchesSearch = [
        lot.product.name,
        lot.product.brand,
        lot.product.barcode,
        lot.lot_code,
        category?.name,
      ]
        .filter(Boolean)
        .some((value) =>
          value.toLowerCase().includes(query)
        );

      const matchesCategory =
        !selectedCategory ||
        lot.product.category_id === selectedCategory;

      let matchesPeriod = true;

      if (selectedPeriod === "expired") {
        matchesPeriod = lot.daysUntilExpiration < 0;
      } else if (selectedPeriod === "today") {
        matchesPeriod = lot.daysUntilExpiration === 0;
      } else if (selectedPeriod === "twoDays") {
        matchesPeriod =
          lot.daysUntilExpiration >= 1 &&
          lot.daysUntilExpiration <= 2;
      } else if (selectedPeriod === "fiveDays") {
        matchesPeriod =
          lot.daysUntilExpiration >= 3 &&
          lot.daysUntilExpiration <= 5;
      }

      return matchesSearch && matchesCategory && matchesPeriod;
    });
  }, [alertLots, search, selectedPeriod, selectedCategory, categories]);

  function clearFilters() {
    setSearch("");
    setSelectedPeriod("all");
    setSelectedCategory("");
  }

  return (
    <div className="alerts-page">

      {/* CABEÇALHO */}
      <header className="alerts-header">
        <div>
          <span className="page-eyebrow">
            CONTROLE DE VALIDADE
          </span>

          <h1>Alertas</h1>

          <p>
            Acompanhe os lotes que precisam de atenção.
          </p>
        </div>

        <button
          type="button"
          className="button-secondary alerts-refresh"
          onClick={loadData}
          disabled={loading}
        >
          ↻ Atualizar
        </button>
      </header>

      {error && (
        <p className="alerts-error">{error}</p>
      )}

      {/* INDICADORES */}
      <section className="alerts-metrics">

        <article className="alert-metric alert-expired">
          <span>Vencidos</span>
          <strong>{loading ? "..." : counts.expired}</strong>
          <small>Lotes fora da validade</small>
        </article>

        <article className="alert-metric alert-today">
          <span>Vencem hoje</span>
          <strong>{loading ? "..." : counts.today}</strong>
          <small>Vencimento no dia atual</small>
        </article>

        <article className="alert-metric alert-two-days">
          <span>Em até 2 dias</span>
          <strong>{loading ? "..." : counts.twoDays}</strong>
          <small>Precisam de atenção</small>
        </article>

        <article className="alert-metric alert-five-days">
          <span>Em até 5 dias</span>
          <strong>{loading ? "..." : counts.fiveDays}</strong>
          <small>Vencimento próximo</small>
        </article>

      </section>

      {/* LISTAGEM */}
      <section className="alerts-content">

        <div className="alerts-list-header">
          <div>
            <h2>Lotes que precisam de atenção</h2>
            <p>
              {filteredLots.length} lote(s) encontrado(s)
            </p>
          </div>
        </div>

        {/* PESQUISA E FILTROS */}
        <div className="alerts-toolbar">

          <input
            type="text"
            placeholder="Pesquisar produto ou código do lote..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            value={selectedPeriod}
            onChange={(event) =>
              setSelectedPeriod(event.target.value)
            }
          >
            <option value="all">Todos os prazos</option>
            <option value="expired">Vencidos</option>
            <option value="today">Vencem hoje</option>
            <option value="twoDays">Em até 2 dias</option>
            <option value="fiveDays">Em até 5 dias</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(event) =>
              setSelectedCategory(event.target.value)
            }
          >
            <option value="">Todas as categorias</option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="button-text"
            onClick={clearFilters}
          >
            Limpar
          </button>

        </div>

        {/* TABELA */}
        {loading ? (
          <p className="alerts-empty">Carregando alertas...</p>
        ) : filteredLots.length > 0 ? (
          <div className="alerts-table-container">
            <table className="alerts-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Código do lote</th>
                  <th>Disponível</th>
                  <th>Validade</th>
                  <th>Prazo</th>
                </tr>
              </thead>

              <tbody>
                {filteredLots.map((lot) => {
                  const category = categories.find(
                    (item) =>
                      item.id === lot.product.category_id
                  );

                  const days = lot.daysUntilExpiration;

                  return (
                    <tr key={lot.id}>
                      <td>
                        <strong>{lot.product.name}</strong>
                        {lot.product.brand && (
                          <small>{lot.product.brand}</small>
                        )}
                      </td>

                      <td>{category?.name || "-"}</td>

                      <td>{lot.lot_code || "-"}</td>

                      <td>
                        {formatQuantity(
                          lot.available,
                          lot.product.unit
                        )}
                      </td>

                      <td>{formatDate(lot.expiration_date)}</td>

                      <td>
                        <span
                          className={`alert-deadline ${
                            days < 0
                              ? "deadline-expired"
                              : days === 0
                              ? "deadline-today"
                              : days <= 2
                              ? "deadline-warning"
                              : "deadline-upcoming"
                          }`}
                        >
                          {getExpirationLabel(days)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alerts-empty">
            <span>✓</span>
            <strong>Nenhum lote encontrado</strong>
            <p>
              Não existem lotes para os filtros selecionados.
            </p>
          </div>
        )}

        <div className="alerts-footer">
          <span>
            Os alertas consideram somente lotes com quantidade disponível.
          </span>

          {onNavigate && (
            <button
              type="button"
              className="dashboard-link"
              onClick={() => onNavigate("stock")}
            >
              Consultar estoque →
            </button>
          )}
        </div>

      </section>

    </div>
  );
}

export default Alertas;
