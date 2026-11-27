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

const alertGroups = [
  {
    id: "expired",
    title: "Vencidos",
    icon: "!",
    tone: "expired",
    description: "Lotes fora da validade. Somente descarte permitido.",
    matches: (days) => days < 0,
  },
  {
    id: "today",
    title: "Vencem hoje",
    icon: "◷",
    tone: "today",
    description: "Lotes que precisam de destinação ainda hoje.",
    matches: (days) => days === 0,
  },
  {
    id: "twoDays",
    title: "Vencem em até 2 dias",
    icon: "◴",
    tone: "two-days",
    description: "Priorize a venda, doação ou oferta desses produtos.",
    matches: (days) => days >= 1 && days <= 2,
  },
  {
    id: "fiveDays",
    title: "Vencem em até 5 dias",
    icon: "▦",
    tone: "five-days",
    description: "Acompanhe os lotes com vencimento próximo.",
    matches: (days) => days >= 3 && days <= 5,
  },
];

function Alertas({ onNavigate, onMenuClick }) {
  const [products, setProducts] = useState([]);
  const [lots, setLots] = useState([]);
  const [movements, setMovements] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Busca os dados reais usados na tela de alertas.
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
      setError("Não foi possível carregar todos os alertas. Atualize a página ou tente novamente.");
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

  // Calcula o saldo disponível e os dias até o vencimento de cada lote.
  const alertLots = useMemo(() => {
    return lots
      .map((lot) => {
        const product = products.find(
          (item) => item.id === lot.product_id
        );

        const totalMoved = movements
          .filter(
            (movement) =>
              movement.lot_id === lot.id &&
              ["VENDIDO", "DOADO", "DESCARTADO"].includes(
                movement.movement_type
              )
          )
          .reduce(
            (total, movement) => total + Number(movement.quantity),
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
          daysUntilExpiration: getDaysUntilExpiration(lot.expiration_date),
        };
      })
      .filter(
        (lot) =>
          lot.product &&
          lot.available > 0 &&
          lot.daysUntilExpiration <= 5
      )
      .sort(
        (a, b) => a.daysUntilExpiration - b.daysUntilExpiration
      );
  }, [lots, products, movements]);

  // Aplica pesquisa e filtros antes de distribuir os lotes pelos grupos.
  const filteredLots = useMemo(() => {
    const query = search.trim().toLowerCase();

    return alertLots.filter((lot) => {
      const category = categories.find(
        (item) => item.id === lot.product.category_id
      );

      const searchableValues = [
        lot.product.name,
        lot.product.brand,
        lot.product.barcode,
        lot.lot_code,
        category?.name,
      ];

      const matchesSearch =
        !query ||
        searchableValues
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));

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

  const groupedLots = useMemo(() => {
    return alertGroups.map((group) => ({
      ...group,
      lots: filteredLots.filter((lot) =>
        group.matches(lot.daysUntilExpiration)
      ),
    }));
  }, [filteredLots]);

  const counts = useMemo(() => ({
    expired: alertLots.filter((lot) => lot.daysUntilExpiration < 0).length,
    today: alertLots.filter((lot) => lot.daysUntilExpiration === 0).length,
    twoDays: alertLots.filter(
      (lot) => lot.daysUntilExpiration >= 1 && lot.daysUntilExpiration <= 2
    ).length,
    fiveDays: alertLots.filter(
      (lot) => lot.daysUntilExpiration >= 3 && lot.daysUntilExpiration <= 5
    ).length,
  }), [alertLots]);

  function getCategoryName(categoryId) {
    return categories.find((category) => category.id === categoryId)?.name || "Categoria não informada";
  }

  function clearFilters() {
    setSearch("");
    setSelectedPeriod("all");
    setSelectedCategory("");
  }

  function handleNavigate(page) {
    if (onNavigate) onNavigate(page);
  }

  return (
    <div className="alerts-page">
      <header className="alerts-header">
      <div className="alerts-heading-copy">
        <div className="alerts-heading">
          <button
            type="button"
            className="alerts-menu-button"
            onClick={onMenuClick}
            aria-label="Abrir menu de navegação"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div>
            <h1>Alertas</h1>
            <p>
              Identifique os lotes que precisam de atenção e escolha a destinação adequada.
            </p>
          </div>
        </div>
      </div>

  <button
    type="button"
    className="alerts-refresh"
    onClick={loadData}
    disabled={loading}
  >
    <span aria-hidden="true">↻</span>
    {loading ? "Atualizando..." : "Atualizar alertas"}
  </button>
      </header>

      {error && <p className="alerts-error" role="alert">{error}</p>}

      <section className="alerts-content" aria-label="Lotes por prazo de validade">
        <div className="alerts-list-header">
          <div>
            <h2>Lotes que precisam de atenção</h2>
            <p>
              {loading
                ? "Carregando lotes..."
                : `${filteredLots.length} lote(s) encontrado(s) com saldo disponível`}
            </p>
          </div>
          <span className="alerts-total-badge">
            {loading ? "..." : `${filteredLots.length} lotes`}
          </span>
        </div>

        <div className="alerts-toolbar">
          <label className="alerts-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="text"
              placeholder="Pesquisar produto, marca ou código do lote..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Pesquisar alertas"
            />
          </label>

          <select
            value={selectedPeriod}
            onChange={(event) => setSelectedPeriod(event.target.value)}
            aria-label="Filtrar por prazo"
          >
            <option value="all">Todos os prazos</option>
            <option value="expired">Vencidos</option>
            <option value="today">Vencem hoje</option>
            <option value="twoDays">Em até 2 dias</option>
            <option value="fiveDays">Em até 5 dias</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            aria-label="Filtrar por categoria"
          >
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <button type="button" className="alerts-clear" onClick={clearFilters}>
            Limpar filtros
          </button>
        </div>

        {loading ? (
          <div className="alerts-empty">
            <span className="alerts-empty-icon" aria-hidden="true">◷</span>
            <strong>Carregando alertas</strong>
            <p>Estamos consultando os lotes e suas validades.</p>
          </div>
        ) : filteredLots.length === 0 ? (
  <div className="alerts-empty alerts-no-data">
    <span className="alerts-empty-icon" aria-hidden="true">✓</span>

    <strong>
      {alertLots.length === 0
        ? "Tudo tranquilo por aqui!"
        : "Nenhum lote encontrado"}
    </strong>

    <p>
      {alertLots.length === 0
        ? "Ainda não existem produtos com lotes próximos do vencimento. Quando você cadastrar lotes com validade próxima, os alertas aparecerão aqui."
        : "Não encontramos lotes para os filtros selecionados. Tente limpar os filtros para visualizar os alertas disponíveis."}
    </p>

    {alertLots.length > 0 && (
      <button
        type="button"
        className="alerts-empty-action"
        onClick={clearFilters}
      >
        Limpar filtros
      </button>
    )}

    <button
      type="button"
      className="alerts-empty-secondary"
      onClick={() => handleNavigate("stock")}
      disabled={!onNavigate}
    >
      Ir para o estoque →
    </button>
  </div>
        ) : (
          <div className="alerts-groups">
            {groupedLots.map((group) => (
              <section
                className={`alert-group alert-group-${group.tone}`}
                key={group.id}
                aria-labelledby={`alert-group-${group.id}`}
              >
                <div className={`alert-group-heading alert-heading-${group.tone}`}>
                  <div className="alert-group-title-wrap">
                    <span className="alert-group-icon" aria-hidden="true">{group.icon}</span>
                    <div>
                      <h3 id={`alert-group-${group.id}`}>{group.title}</h3>
                      <p>{group.description}</p>
                    </div>
                  </div>
                  <span className="alert-group-count">
                    {group.lots.length} {group.lots.length === 1 ? "lote" : "lotes"}
                  </span>
                </div>

                {group.lots.length > 0 ? (
                  <div className="alert-cards-grid">
                    {group.lots.map((lot) => {
                      const days = lot.daysUntilExpiration;
                      const deadlineText = days < 0
                        ? "Vencido"
                        : days === 0
                        ? "Hoje"
                        : `${days} ${days === 1 ? "dia" : "dias"}`;

                      return (
                        <article className="alert-lot-card" key={lot.id}>
                          <div className="alert-lot-top">
                            <div className="alert-lot-main">
                              <span className="alert-lot-category">
                                {getCategoryName(lot.product.category_id)}
                              </span>
                              <h4 title={lot.product.name}>{lot.product.name}</h4>
                              {lot.product.brand && (
                                <p className="alert-lot-brand">{lot.product.brand}</p>
                              )}
                              <p className="alert-lot-code" title={lot.lot_code || "Código não informado"}>
                                Lote: {lot.lot_code || "Não informado"}
                              </p>
                            </div>
                            <span className={`alert-lot-badge alert-badge-${group.tone}`}>
                              {deadlineText}
                            </span>
                          </div>

                          <div className="alert-lot-details">
                            <div>
                              <span>Disponível</span>
                              <strong>{formatQuantity(lot.available, lot.product.unit)}</strong>
                            </div>
                            <div>
                              <span>Validade</span>
                              <strong className={days < 0 ? "alert-date-expired" : ""}>
                                {formatDate(lot.expiration_date)}
                              </strong>
                            </div>
                          </div>

                          <p className="alert-lot-deadline">
                            {getExpirationLabel(days)}
                          </p>

                          {(group.id === "expired" || group.id === "today") && (
                            <div className="alert-lot-actions">
                              {group.id === "expired" ? (
                                <button
                                  type="button"
                                  className="alert-action alert-action-danger"
                                  onClick={() => handleNavigate("movements")}
                                  disabled={!onNavigate}
                                  title="Abra movimentações para registrar o descarte deste lote"
                                >
                                  Ver movimentações para descarte
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="alert-action alert-action-primary"
                                    onClick={() => handleNavigate("offers")}
                                    disabled={!onNavigate}
                                  >
                                    Gerenciar ofertas
                                  </button>
                                  <button
                                    type="button"
                                    className="alert-action alert-action-secondary"
                                    onClick={() => handleNavigate("movements")}
                                    disabled={!onNavigate}
                                  >
                                    Ver movimentações
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="alert-group-empty">
                    Nenhum lote nesta faixa de validade para os filtros selecionados.
                  </div>
                )}
              </section>
            ))}
          </div>
        )}

        <footer className="alerts-footer">
          <span>Os alertas consideram somente lotes com quantidade disponível. Produtos vencidos só permitem registro de descarte.</span>
          <button
            type="button"
            className="alerts-stock-link"
            onClick={() => handleNavigate("stock")}
            disabled={!onNavigate}
          >
            Consultar estoque <span aria-hidden="true">→</span>
          </button>
        </footer>
      </section>
    </div>
  );
}

export default Alertas;
