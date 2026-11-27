
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./services/supabase";
import GerenciamentoProdutos from "./pages/GerenciamentoProdutos";
import Alertas from "./pages/Alertas";
import Ofertas from "./pages/Ofertas";
import VitrineOfertas from "./pages/VitrineOfertas";
import "./App.css";

const navigation = [
  {
    title: "PRINCIPAL",
    items: [
      { id: "overview", label: "Visão geral", icon: "▦" },
    ],
  },
  {
    title: "GESTÃO",
    items: [
      { id: "stock", label: "Estoque", icon: "▤" },
      { id: "products", label: "Produtos", icon: "▦" },
      { id: "movements", label: "Movimentações", icon: "↔" },
    ],
  },
  {
    title: "OPERAÇÃO",
    items: [
      { id: "alerts", label: "Alertas", icon: "◷" },
      { id: "offers", label: "Ofertas", icon: "◇" },
    ],
  },
];

const movementLabels = {
  VENDIDO: "Vendido",
  DOADO: "Doado",
  DESCARTADO: "Descartado",
};

function getDaysUntilExpiration(date) {
  const [year, month, day] = date.split("-").map(Number);
  const expiration = new Date(year, month - 1, day);
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return Math.round(
    (expiration.getTime() - today.getTime()) / 86400000
  );
}

function formatQuantity(value, unit) {
  return `${Number(value).toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  })} ${unit || "UN"}`;
}

// Formata os totais sem misturar unidades diferentes
function formatUnitSummary(totals) {
  return Object.entries(totals)
    .filter(([, quantity]) => quantity > 0)
    .map(([unit, quantity]) => formatQuantity(quantity, unit))
    .join(" · ") || "0";
}

function App() {
  const [activePage, setActivePage] = useState("overview");

  const inventoryPages = ["stock", "products", "movements"];

  const currentPath =
    window.location.pathname.replace(/\/+$/, "") || "/";

  if (currentPath === "/ofertas") {
    return <VitrineOfertas />;
  }

  return (
    <div className="app-shell">

      {/* SIDEBAR */}
      <aside className="app-sidebar">

        <div className="sidebar-brand">
          <div className="brand-icon">C</div>

          <div>
            <strong>CARREFORT</strong>
            <span>GESTÃO DE ESTOQUE</span>
          </div>
        </div>

        <nav className="sidebar-navigation">

          {navigation.map((group) => (
            <div className="sidebar-group" key={group.title}>

              <span className="sidebar-group-title">
                {group.title}
              </span>

              {group.items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`sidebar-link ${
                    activePage === item.id ? "active" : ""
                  }`}
                  onClick={() => setActivePage(item.id)}
                >
                  <span className="sidebar-icon">
                    {item.icon}
                  </span>

                  {item.label}
                </button>
              ))}

            </div>
          ))}

        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-status"></span>
          Painel administrativo
        </div>

      </aside>

      {/* CONTEÚDO */}
      <main className="app-main">

        {activePage === "overview" && (
          <DashboardOverview onNavigate={setActivePage} />
        )}

        {inventoryPages.includes(activePage) && (
          <GerenciamentoProdutos
            initialTab={activePage}
            showTabs={false}
          />
        )}

        {activePage === "alerts" && (
          <Alertas onNavigate={setActivePage} />
        )}

        {activePage === "offers" && (
          <Ofertas onNavigate={setActivePage} />
        )}

      </main>

    </div>
  );
}

function DashboardOverview({ onNavigate }) {
  const [products, setProducts] = useState([]);
  const [lots, setLots] = useState([]);
  const [movements, setMovements] = useState([]);
  const [offers, setOffers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Carrega os dados do Supabase
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    const [
      productsResult,
      lotsResult,
      movementsResult,
      offersResult,
    ] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, unit")
        .order("name"),

      supabase
        .from("lots")
        .select(
          "id, product_id, lot_code, quantity_received, expiration_date"
        )
        .order("expiration_date"),

      supabase
        .from("stock_movements")
        .select("id, lot_id, movement_type, quantity, created_at")
        .order("created_at", { ascending: false }),

      supabase
        .from("offers")
        .select("id, lot_id, is_active, created_at")
        .order("created_at", { ascending: false }),
    ]);

    const errors = [
      productsResult.error,
      lotsResult.error,
      movementsResult.error,
      offersResult.error,
    ].filter(Boolean);

    if (errors.length) {
      console.error("Erro ao carregar painel:", errors);
      setLoadError(
        "Não foi possível carregar todos os dados do painel."
      );
    }

    setProducts(productsResult.data || []);
    setLots(lotsResult.data || []);
    setMovements(movementsResult.data || []);
    setOffers(offersResult.data || []);

    setLoading(false);
  }, []);

  // Primeira carga dos dados
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Atualiza o painel quando houver alterações no banco
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-overview-realtime")

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "offers",
        },
        () => {
          loadDashboard();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lots",
        },
        () => {
          loadDashboard();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stock_movements",
        },
        () => {
          loadDashboard();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          loadDashboard();
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboard]);

  // Relaciona produtos, lotes e movimentações
  const lotsWithInfo = useMemo(() => {
    return lots.map((lot) => {
      const product = products.find(
        (item) => item.id === lot.product_id
      );

      const lotMovements = movements.filter(
        (movement) => movement.lot_id === lot.id
      );

      const moved = lotMovements.reduce(
        (total, movement) => total + Number(movement.quantity),
        0
      );

      const available = Math.max(
        0,
        Number(lot.quantity_received) - moved
      );

      return {
        ...lot,
        product,
        available,
        daysUntilExpiration: getDaysUntilExpiration(
          lot.expiration_date
        ),
      };
    });
  }, [products, lots, movements]);

  // Estoque separado por unidade
  const stockTotals = useMemo(() => {
    const totals = {
      UN: 0,
      KG: 0,
      L: 0,
    };

    lotsWithInfo.forEach((lot) => {
      const unit = lot.product?.unit || "UN";

      if (Object.hasOwn(totals, unit)) {
        totals[unit] += lot.available;
      }
    });

    return totals;
  }, [lotsWithInfo]);

  // Produtos sem estoque
  const emptyProducts = useMemo(() => {
    return products.filter((product) => {
      const totalAvailable = lotsWithInfo
        .filter((lot) => lot.product_id === product.id)
        .reduce((total, lot) => total + lot.available, 0);

      return totalAvailable <= 0;
    });
  }, [products, lotsWithInfo]);

  // Situação das validades
  const expirationCounts = useMemo(() => {
    const activeLots = lotsWithInfo.filter(
      (lot) => lot.available > 0
    );

    return {
      expired: activeLots.filter(
        (lot) => lot.daysUntilExpiration < 0
      ).length,

      today: activeLots.filter(
        (lot) => lot.daysUntilExpiration === 0
      ).length,

      twoDays: activeLots.filter(
        (lot) =>
          lot.daysUntilExpiration >= 1 &&
          lot.daysUntilExpiration <= 2
      ).length,

      fiveDays: activeLots.filter(
        (lot) =>
          lot.daysUntilExpiration >= 3 &&
          lot.daysUntilExpiration <= 5
      ).length,
    };
  }, [lotsWithInfo]);

  const lotsAtRisk =
    expirationCounts.today +
    expirationCounts.twoDays +
    expirationCounts.fiveDays;

  // Produtos prioritários
  const priorityLots = useMemo(() => {
    return lotsWithInfo
      .filter(
        (lot) =>
          lot.available > 0 &&
          lot.daysUntilExpiration <= 5
      )
      .sort(
        (a, b) =>
          a.daysUntilExpiration - b.daysUntilExpiration
      )
      .slice(0, 5);
  }, [lotsWithInfo]);

  // Destinação dos produtos nos últimos 7 dias
  const lossSummary = useMemo(() => {
    const result = {
      VENDIDO: { UN: 0, KG: 0, L: 0 },
      DOADO: { UN: 0, KG: 0, L: 0 },
      DESCARTADO: { UN: 0, KG: 0, L: 0 },
    };

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    movements.forEach((movement) => {
      if (
        !result[movement.movement_type] ||
        new Date(movement.created_at) < cutoff
      ) {
        return;
      }

      const lot = lots.find(
        (item) => item.id === movement.lot_id
      );

      const product = products.find(
        (item) => item.id === lot?.product_id
      );

      const unit = product?.unit || "UN";

      if (!Object.hasOwn(result[movement.movement_type], unit)) {
        return;
      }

      result[movement.movement_type][unit] +=
        Number(movement.quantity);
    });

    return result;
  }, [movements, lots, products]);

  // Quantidade recuperada: vendido + doado
  const recoveredSummary = useMemo(() => {
    const recovered = {
      UN: 0,
      KG: 0,
      L: 0,
    };

    ["UN", "KG", "L"].forEach((unit) => {
      recovered[unit] =
        lossSummary.VENDIDO[unit] +
        lossSummary.DOADO[unit];
    });

    return recovered;
  }, [lossSummary]);

  // Movimentações recentes
  const recentMovements = useMemo(() => {
    return movements.slice(0, 5).map((movement) => {
      const lot = lots.find(
        (item) => item.id === movement.lot_id
      );

      const product = products.find(
        (item) => item.id === lot?.product_id
      );

      return {
        ...movement,
        productName: product?.name || "Produto não encontrado",
        unit: product?.unit || "UN",
      };
    });
  }, [movements, lots, products]);

  // Ofertas disponíveis para os clientes
  const availableOffers = useMemo(() => {
    return offers
      .filter((offer) => offer.is_active)
      .map((offer) => {
        const lot = lotsWithInfo.find(
          (item) => item.id === offer.lot_id
        );

        return {
          ...offer,
          lot,
        };
      })
      .filter(
        (offer) =>
          offer.lot &&
          offer.lot.available > 0 &&
          offer.lot.daysUntilExpiration >= 0
      );
  }, [offers, lotsWithInfo]);

  // Ofertas pausadas
  const pausedOffersCount = useMemo(() => {
    return offers.filter((offer) => !offer.is_active).length;
  }, [offers]);

  // Ofertas ativas, mas sem disponibilidade
  const unavailableOffersCount = useMemo(() => {
    return offers.filter((offer) => {
      if (!offer.is_active) return false;

      const lot = lotsWithInfo.find(
        (item) => item.id === offer.lot_id
      );

      return (
        !lot ||
        lot.available <= 0 ||
        lot.daysUntilExpiration < 0
      );
    }).length;
  }, [offers, lotsWithInfo]);

  const metrics = [
    {
      icon: "▤",
      title: "Produtos cadastrados",
      value: products.length,
      description: "Total no catálogo",
    },
    {
      icon: "▦",
      title: "Estoque disponível",
      value: formatQuantity(stockTotals.UN, "UN"),
      description:
        `${formatQuantity(stockTotals.KG, "KG")} · ${formatQuantity(stockTotals.L, "L")}`,
    },
    {
      icon: "◷",
      title: "Próximos do vencimento",
      value: lotsAtRisk,
      description: "Lotes nos próximos 5 dias",
    },
    {
      icon: "!",
      title: "Sem estoque",
      value: emptyProducts.length,
      description: "Produtos sem saldo disponível",
    },
  ];

  return (
    <div className="overview-page">

      <header className="overview-header">
        <div>
          <span className="page-eyebrow">
            PAINEL ADMINISTRATIVO
          </span>

          <h1>Visão geral</h1>

          <p>
            Acompanhe os principais indicadores do seu estoque.
          </p>
        </div>

        <span className="overview-date">
          {new Date().toLocaleDateString("pt-BR")}
        </span>
      </header>

      {loadError && (
        <p className="feedback error">{loadError}</p>
      )}

      {/* INDICADORES PRINCIPAIS */}
      <section className="overview-metrics">

        {metrics.map((metric) => (
          <article className="overview-card" key={metric.title}>
            <div className="metric-top">
              <span className="metric-icon">{metric.icon}</span>
            </div>

            <span className="metric-title">{metric.title}</span>

            <strong className="metric-value">
              {loading ? "..." : metric.value}
            </strong>

            <span className="metric-description">
              {metric.description}
            </span>
          </article>
        ))}

      </section>

      {/* CENTRAL DE ATENÇÃO E MOVIMENTAÇÕES */}
      <section className="overview-panels">

        <article className="overview-panel">
          <div className="panel-header">
            <div>
              <h2>Central de atenção</h2>
              <p>Produtos que precisam de atenção.</p>
            </div>
          </div>

          <div className="expiration-list">
            <div>
              <span className="expiration-dot expired"></span>
              Vencidos
              <strong>
                {loading ? "..." : expirationCounts.expired}
              </strong>
            </div>

            <div>
              <span className="expiration-dot today"></span>
              Vencem hoje
              <strong>
                {loading ? "..." : expirationCounts.today}
              </strong>
            </div>

            <div>
              <span className="expiration-dot warning"></span>
              Em até 2 dias
              <strong>
                {loading ? "..." : expirationCounts.twoDays}
              </strong>
            </div>

            <div>
              <span className="expiration-dot upcoming"></span>
              Em até 5 dias
              <strong>
                {loading ? "..." : expirationCounts.fiveDays}
              </strong>
            </div>

            <div>
              <span className="expiration-dot expired"></span>
              Produtos sem estoque
              <strong>
                {loading ? "..." : emptyProducts.length}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="dashboard-link"
            onClick={() => onNavigate("alerts")}
          >
            Acessar alertas →
          </button>
        </article>

        <article className="overview-panel">
          <div className="panel-header">
            <div>
              <h2>Movimentações recentes</h2>
              <p>Últimas atividades do estoque.</p>
            </div>
          </div>

          {loading ? (
            <p className="panel-empty">
              Carregando movimentações...
            </p>
          ) : recentMovements.length > 0 ? (
            <div className="recent-movements">
              {recentMovements.map((movement) => (
                <div className="recent-movement" key={movement.id}>
                  <div>
                    <strong>{movement.productName}</strong>

                    <span>
                      {movementLabels[movement.movement_type] ||
                        movement.movement_type}
                      {" · "}
                      {new Date(
                        movement.created_at
                      ).toLocaleDateString("pt-BR")}
                    </span>
                  </div>

                  <strong>
                    {formatQuantity(
                      movement.quantity,
                      movement.unit
                    )}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="panel-empty">
              Nenhuma movimentação registrada.
            </p>
          )}

          <button
            type="button"
            className="dashboard-link"
            onClick={() => onNavigate("movements")}
          >
            Acessar movimentações →
          </button>
        </article>

      </section>

      {/* DESTINAÇÃO DOS PRODUTOS E PRODUTOS PRIORITÁRIOS */}
      <section className="overview-panels">

        <article className="overview-panel">
          <div className="panel-header">
            <div>
              <h2>Destinação dos produtos</h2>
              <p>Movimentações dos últimos 7 dias.</p>
            </div>
          </div>

          <div className="loss-summary">
            {["VENDIDO", "DOADO", "DESCARTADO"].map((type) => {
              const summary = formatUnitSummary(lossSummary[type]);

              return (
                <div className="loss-item" key={type}>
                  <span>{movementLabels[type]}</span>

                  <strong>
                    {loading ? "..." : summary}
                  </strong>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="dashboard-link"
            onClick={() => onNavigate("movements")}
          >
            Ver movimentações →
          </button>
        </article>

        <article className="overview-panel">
          <div className="panel-header">
            <div>
              <h2>Produtos que precisam de atenção</h2>
              <p>Próximos do vencimento.</p>
            </div>
          </div>

          {loading ? (
            <p className="panel-empty">
              Carregando produtos...
            </p>
          ) : priorityLots.length > 0 ? (
            <div className="priority-list">
              {priorityLots.map((lot) => (
                <div className="priority-item" key={lot.id}>
                  <div>
                    <strong>
                      {lot.product?.name || "Produto"}
                    </strong>

                    <span>
                      Lote: {lot.lot_code || "-"}
                      {" · "}
                      {formatQuantity(
                        lot.available,
                        lot.product?.unit
                      )}
                    </span>
                  </div>

                  <span
                    className={`status ${
                      lot.daysUntilExpiration <= 0
                        ? "status-expired"
                        : "status-twoDays"
                    }`}
                  >
                    {lot.daysUntilExpiration < 0
                      ? "Vencido"
                      : lot.daysUntilExpiration === 0
                      ? "Hoje"
                      : `${lot.daysUntilExpiration} dias`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="panel-empty">
              Nenhum lote próximo do vencimento.
            </p>
          )}

          <button
            type="button"
            className="dashboard-link"
            onClick={() => onNavigate("alerts")}
          >
            Ver todos os alertas →
          </button>
        </article>

      </section>

      {/* OFERTAS DE ÚLTIMA HORA */}
      <section className="overview-panel">
        <div className="panel-header">
          <div>
            <h2>Ofertas de última hora</h2>
            <p>
              Ofertas ativas com estoque disponível e validade em dia.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="panel-empty">
            Carregando ofertas...
          </p>
        ) : availableOffers.length > 0 ? (
          <>
            <div className="priority-list">
              {availableOffers.slice(0, 5).map((offer) => (
                <div className="priority-item" key={offer.id}>
                  <div>
                    <strong>
                      {offer.lot.product?.name || "Produto"}
                    </strong>

                    <span>
                      Lote: {offer.lot.lot_code || "-"}
                      {" · "}
                      {formatQuantity(
                        offer.lot.available,
                        offer.lot.product?.unit
                      )}
                    </span>
                  </div>

                  <span className="status status-twoDays">
                    {offer.lot.daysUntilExpiration === 0
                      ? "Vence hoje"
                      : `Vence em ${offer.lot.daysUntilExpiration} dias`}
                  </span>
                </div>
              ))}
            </div>

            {availableOffers.length > 5 && (
              <p className="panel-empty">
                E mais {availableOffers.length - 5} oferta(s) ativa(s).
              </p>
            )}
          </>
        ) : (
          <p className="panel-empty">
            Nenhuma oferta disponível no momento.
          </p>
        )}

        <div className="loss-summary">
          <div className="loss-item">
            <span>Ofertas disponíveis</span>
            <strong>
              {loading ? "..." : availableOffers.length}
            </strong>
          </div>

          <div className="loss-item">
            <span>Ofertas pausadas</span>
            <strong>
              {loading ? "..." : pausedOffersCount}
            </strong>
          </div>

          <div className="loss-item">
            <span>Sem disponibilidade</span>
            <strong>
              {loading ? "..." : unavailableOffersCount}
            </strong>
          </div>
        </div>

        <button
          type="button"
          className="dashboard-link"
          onClick={() => onNavigate("offers")}
        >
          Gerenciar ofertas →
        </button>

        <button
          type="button"
          className="dashboard-link"
          onClick={loadDashboard}
          disabled={loading}
        >
          {loading ? "Atualizando..." : "Atualizar painel ↻"}
        </button>
      </section>

{/* IMPACTO NA REDUÇÃO DO DESPERDÍCIO */}
      <section className="overview-panel impact-panel">

        <div className="panel-header">
          <div>
            <h2>Impacto na redução do desperdício</h2>
            <p>
              Destinação dos produtos registrados nos últimos 7 dias.
            </p>
          </div>
        </div>

        <div className="overview-metrics">

          <article className="overview-card">
            <div className="metric-top">
              <span className="metric-icon">↗</span>
            </div>

            <span className="metric-title">
              Vendido
            </span>

            <strong className="metric-value">
              {loading
                ? "..."
                : formatUnitSummary(lossSummary.VENDIDO)}
            </strong>

            <span className="metric-description">
              Produtos comercializados
            </span>
          </article>

          <article className="overview-card">
            <div className="metric-top">
              <span className="metric-icon">♡</span>
            </div>

            <span className="metric-title">
              Doado
            </span>

            <strong className="metric-value">
              {loading
                ? "..."
                : formatUnitSummary(lossSummary.DOADO)}
            </strong>

            <span className="metric-description">
              Produtos destinados à doação
            </span>
          </article>

          <article className="overview-card">
            <div className="metric-top">
              <span className="metric-icon">!</span>
            </div>

            <span className="metric-title">
              Descartado
            </span>

            <strong className="metric-value">
              {loading
                ? "..."
                : formatUnitSummary(lossSummary.DESCARTADO)}
            </strong>

            <span className="metric-description">
              Produtos registrados como perda
            </span>
          </article>

          <article className="overview-card">
            <div className="metric-top">
              <span className="metric-icon">✓</span>
            </div>

            <span className="metric-title">
              Recuperado
            </span>

            <strong className="metric-value">
              {loading
                ? "..."
                : formatUnitSummary(recoveredSummary)}
            </strong>

            <span className="metric-description">
              Vendido + doado
            </span>
          </article>

        </div>

        <p className="dashboard-disclaimer">
          Os valores representam movimentações registradas no sistema.
          A quantidade recuperada corresponde à soma de produtos vendidos
          e doados, não a uma estimativa de desperdício evitado.
        </p>

      </section>
      
    </div>
  );
}

export default App;
