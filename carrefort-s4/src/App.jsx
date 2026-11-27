
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./services/supabase";
import GerenciamentoProdutos from "./pages/GerenciamentoProdutos";
import Alertas from "./pages/Alertas";
import Ofertas from "./pages/Ofertas";
import VitrineOfertas from "./pages/VitrineOfertas";
import "./App.css";
import Login from "./pages/Login";

const navigation = [
  { id: "overview", label: "Visão geral", icon: "layout-grid" },
  { id: "stock", label: "Estoque", icon: "package" },
  { id: "products", label: "Produtos", icon: "shopping-bag" },
  { id: "alerts", label: "Alertas", icon: "bell-ring" },
  { id: "offers", label: "Gestão de ofertas", icon: "tag" },
  { id: "movements", label: "Movimentações", icon: "arrow-left-right" },
];

const movementLabels = {
  VENDIDO: "Vendido",
  DOADO: "Doado",
  DESCARTADO: "Descartado",
};

function Icon({ name, size = 18, className }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  const drawings = {
    "layout-grid": <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>,
    package: <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4.3 7.7 7.7 4.4 7.7-4.4M12 12v9M8 5.2l8 4.5" />
    </>,
    "shopping-bag": <>
      <path d="M5 8h14l-1 13H6L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>,
    "bell-ring": <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
      <path d="M19 3.5 21 5.5M5 3.5 3 5.5" />
    </>,
    tag: <>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1" />
    </>,
    "arrow-left-right": <>
      <path d="M17 3l4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3" />
    </>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    x: <><path d="m18 6-12 12M6 6l12 12" /></>,
    store: <>
      <path d="M3 10V21h18V10M2 10l2-7h16l2 7" />
      <path d="M2 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      <path d="M9 21v-6h6v6" />
    </>,
    "external-link": <>
      <path d="M13 5h6v6M19 5l-9 9" />
      <path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>,
    leaf: <>
      <path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-8 8-16Z" />
      <path d="M4 21c3-5 7-8 13-11" />
    </>,
    "chevron-down": <><path d="m6 9 6 6 6-6" /></>,
    "alert-circle": <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </>,
    "calendar-clock": <>
      <rect x="3" y="4" width="13" height="16" rx="2" />
      <path d="M7 2v4M12 2v4M3 9h13" />
      <circle cx="18" cy="16" r="4" />
      <path d="M18 14v2l1.5 1" />
    </>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    "calendar-days": <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 9h18M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
    </>,
    "arrow-right": <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    "refresh-cw": <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3" />
    </>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    calendar: <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 9h18" />
    </>,
    sprout: <>
      <path d="M12 21v-8M12 13C5 13 4 8 4 4c5 0 8 2 8 7M12 13c0-6 3-9 8-9 0 5-2 9-8 9Z" />
    </>,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      {...common}
    >
      {drawings[name] || drawings.package}
    </svg>
  );
}

function getDaysUntilExpiration(date) {
  if (!date) return null;
  const [year, month, day] = date.split("-").map(Number);
  const expiration = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((expiration.getTime() - today.getTime()) / 86400000);
}

function formatDate(date) {
  if (!date) return "-";
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
}

function formatQuantity(value, unit) {
  return `${Number(value || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  })} ${unit || "UN"}`;
}

function truncateText(value, limit) {
  const text = String(value || "");
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trimEnd()}…`;
}

// Mantém UN, KG e L separados para não somar unidades diferentes.
function formatUnitSummary(totals) {
  return Object.entries(totals)
    .filter(([, quantity]) => quantity > 0)
    .map(([unit, quantity]) => formatQuantity(quantity, unit))
    .join(" · ") || "0";
}

function summarizeLots(lotList) {
  const totals = { UN: 0, KG: 0, L: 0 };

  lotList.forEach((lot) => {
    const unit = lot.product?.unit || "UN";
    if (Object.hasOwn(totals, unit)) {
      totals[unit] += lot.available;
    }
  });

  return totals;
}

function getExpirationStatus(days) {
  if (days < 0) return { label: "Vencido", className: "badge-danger" };
  if (days === 0) return { label: "Vence hoje", className: "badge-danger" };
  if (days === 1) return { label: "Vence amanhã", className: "badge-danger" };
  if (days <= 5) return { label: `${days} dias`, className: "badge-warning" };
  return { label: `${days} dias`, className: "badge-safe" };
}

function App() {
  const [activePage, setActivePage] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";

  const updateAlertCount = useCallback((count) => {
    setAlertCount(count);
  }, []);

  // Verifica a sessão do funcionário.
  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("Erro ao verificar sessão:", error);
      }

      setSession(data?.session || null);
      setAuthLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Busca os dados do funcionário na tabela profiles.
  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!session?.user?.id) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, job_title, avatar_url")
        .eq("id", session.user.id)
        .single();

      if (!mounted) return;

      if (error) {
        console.error("Erro ao carregar perfil:", error);
        setProfile(null);
        return;
      }

      setProfile(data);
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [session]);

  // Impede o acesso ao painel sem autenticação.
  useEffect(() => {
    if (currentPath === "/admin" && !authLoading && !session) {
      window.location.replace("/login");
    }
  }, [currentPath, authLoading, session]);

  // Encerra a sessão e volta para a vitrine pública.
  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erro ao sair:", error);
      return;
    }

    window.location.replace("/");
  }

  const profileName = profile?.full_name || "Funcionário";
  const profileRole = profile?.job_title || "Funcionário";
  const profileInitials = profileName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  // Vitrine pública: página inicial e /ofertas.
  if (currentPath === "/" || currentPath === "/ofertas") {
    return <VitrineOfertas />;
  }

  // Tela de login.
  if (currentPath === "/login") {
    return <Login />;
  }

  // Qualquer rota diferente das rotas conhecidas mostra a vitrine.
  if (currentPath !== "/admin") {
    return <VitrineOfertas />;
  }

  // Aguarda a verificação da sessão antes de exibir o painel.
  if (authLoading || !session) {
    return (
      <div className="auth-loading">
        Verificando acesso...
      </div>
    );
  }

  return (
    <div id="admin-view" className="app-shell">
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div>
          <div className="brand">
            <div className="brand-link">
              <div className="brand-logo" aria-hidden="true">
                <Icon name="leaf" size={23} />
              </div>
              <div>
                <span className="brand-name">Carrefort</span>
                <span className="brand-sub">Gestão de Validade</span>
              </div>
            </div>
            <button
              type="button"
              className="mobile-close-btn"
              onClick={() => setSidebarOpen(false)}
              aria-label="Fechar menu"
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          <nav aria-label="Menu principal">
            <ul className="nav-list">
              {navigation.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`nav-item ${activePage === item.id ? "active" : ""}`}
                    onClick={() => {
                      setActivePage(item.id);
                      setSidebarOpen(false);
                    }}
                  >
                    <span className="nav-item-left">
                      <Icon name={item.icon} className="nav-icon" />
                      <span>{item.label}</span>
                    </span>
                    {item.id === "alerts" && alertCount > 0 && (
                      <span className="nav-pill">{alertCount}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-footer">
            <div className="sidebar-footer-icon">
              <Icon name="sprout" size={21} />
            </div>
            <div className="sidebar-footer-title">
              Menos desperdício, mais sustentabilidade.
            </div>
            <div className="sidebar-footer-desc">
              Cada produto controlado é comida que não vai para o lixo.
            </div>
          </div>

          <a href="/ofertas" className="btn-storefront-sidebar">
            <span className="storefront-button-label">
              <Icon name="store" size={16} />
              <span>Ver vitrine pública</span>
            </span>
            <Icon name="external-link" size={14} />
          </a>

          <div className="sidebar-user">
            {profile?.avatar_url ? (
              <img
                className="sidebar-user-badge"
                src={profile.avatar_url}
                alt={`Foto de ${profileName}`}
              />
            ) : (
              <div className="sidebar-user-badge">{profileInitials || "F"}</div>
            )}

            <div>
              <div className="sidebar-user-name">{profileName}</div>
              <div className="sidebar-user-role">{profileRole}</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-wrapper">
        {activePage === "overview" && (
          <DashboardOverview
            onNavigate={setActivePage}
            onOpenSidebar={() => setSidebarOpen(true)}
            onAlertCountChange={updateAlertCount}
            profileName={profileName}
            profileRole={profileRole}
            profileAvatar={profile?.avatar_url}
            profileInitials={profileInitials}
            onSignOut={handleSignOut}
          />
        )}

        {activePage === "stock" && (
          <GerenciamentoProdutos
            initialTab="stock"
            showTabs={false}
            onMenuClick={() => setSidebarOpen(true)}
          />
        )}

        {activePage === "products" && (
          <GerenciamentoProdutos
            initialTab="products"
            showTabs={false}
            onMenuClick={() => setSidebarOpen(true)}
          />
        )}

        {activePage === "alerts" && (
          <Alertas
            onNavigate={setActivePage}
            onMenuClick={() => setSidebarOpen(true)}
          />
        )}

        {activePage === "offers" && (
          <Ofertas
            onNavigate={setActivePage}
            onMenuClick={() => setSidebarOpen(true)}
          />
        )}

        {activePage === "movements" && (
          <GerenciamentoProdutos
            initialTab="movements"
            showTabs={false}
            onMenuClick={() => setSidebarOpen(true)}
          />
        )}
      </main>
    </div>
  );
}

function DashboardOverview({
  onNavigate,
  onOpenSidebar,
  onAlertCountChange,
  profileName,
  profileRole,
  profileAvatar,
  profileInitials,
  onSignOut,
}) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [lots, setLots] = useState([]);
  const [movements, setMovements] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileWrapperRef = useRef(null);

  useEffect(() => {
    function closeProfileMenu(event) {
      if (!profileWrapperRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", closeProfileMenu);
    return () => document.removeEventListener("mousedown", closeProfileMenu);
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [productsResult, categoriesResult, lotsResult, movementsResult, offersResult] =
        await Promise.all([
          supabase
            .from("products")
            .select("id, name, unit, category_id")
            .order("name"),
          supabase.from("categories").select("id, name").order("name"),
          supabase
            .from("lots")
            .select("id, product_id, lot_code, quantity_received, expiration_date")
            .order("expiration_date"),
          supabase
            .from("stock_movements")
            .select("id, lot_id, movement_type, quantity, notes, created_at")
            .order("created_at", { ascending: false }),
          supabase
            .from("offers")
            .select("id, lot_id, is_active, created_at")
            .order("created_at", { ascending: false }),
        ]);

      const errors = [
        productsResult.error,
        categoriesResult.error,
        lotsResult.error,
        movementsResult.error,
        offersResult.error,
      ].filter(Boolean);

      if (errors.length) {
        console.error("Erro ao carregar painel:", errors);
        setLoadError("Não foi possível carregar todos os dados do painel.");
      }

      setProducts(productsResult.data || []);
      setCategories(categoriesResult.data || []);
      setLots(lotsResult.data || []);
      setMovements(movementsResult.data || []);
      setOffers(offersResult.data || []);
    } catch (error) {
      console.error("Erro inesperado ao carregar painel:", error);
      setLoadError("Ocorreu um erro ao carregar os dados do painel.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-overview-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offers" },
        loadDashboard
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lots" },
        loadDashboard
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stock_movements" },
        loadDashboard
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        loadDashboard
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        loadDashboard
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboard]);

  const categoryById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category.name]));
  }, [categories]);

  // Relaciona produtos, lotes e movimentações e calcula o saldo de cada lote.
  const lotsWithInfo = useMemo(() => {
    const movementsByLot = new Map();

    movements.forEach((movement) => {
      const current = movementsByLot.get(movement.lot_id) || [];
      current.push(movement);
      movementsByLot.set(movement.lot_id, current);
    });

    return lots.map((lot) => {
      const product = products.find((item) => item.id === lot.product_id);
      const lotMovements = movementsByLot.get(lot.id) || [];
      const moved = lotMovements.reduce(
        (total, movement) => total + Number(movement.quantity),
        0
      );
      const available = Math.max(0, Number(lot.quantity_received) - moved);

      return {
        ...lot,
        product,
        categoryName: categoryById.get(product?.category_id) || "Não informado",
        available,
        daysUntilExpiration: getDaysUntilExpiration(lot.expiration_date),
      };
    });
  }, [products, categories, categoryById, lots, movements]);

  const stockTotals = useMemo(() => summarizeLots(lotsWithInfo), [lotsWithInfo]);

  const emptyProducts = useMemo(() => {
    return products.filter((product) => {
      const totalAvailable = lotsWithInfo
        .filter((lot) => lot.product_id === product.id)
        .reduce((total, lot) => total + lot.available, 0);
      return totalAvailable <= 0;
    });
  }, [products, lotsWithInfo]);

  const activeLots = useMemo(
    () => lotsWithInfo.filter((lot) => lot.available > 0),
    [lotsWithInfo]
  );

  const expirationGroups = useMemo(() => {
    return {
      expired: activeLots.filter((lot) => lot.daysUntilExpiration < 0),
      today: activeLots.filter((lot) => lot.daysUntilExpiration === 0),
      twoDays: activeLots.filter(
        (lot) => lot.daysUntilExpiration >= 1 && lot.daysUntilExpiration <= 2
      ),
      fiveDays: activeLots.filter(
        (lot) => lot.daysUntilExpiration >= 3 && lot.daysUntilExpiration <= 5
      ),
    };
  }, [activeLots]);

  const expirationCounts = useMemo(
    () => ({
      expired: expirationGroups.expired.length,
      today: expirationGroups.today.length,
      twoDays: expirationGroups.twoDays.length,
      fiveDays: expirationGroups.fiveDays.length,
    }),
    [expirationGroups]
  );

  const lotsAtRisk =
    expirationCounts.today + expirationCounts.twoDays + expirationCounts.fiveDays;

  useEffect(() => {
    onAlertCountChange?.(
      expirationCounts.expired +
        expirationCounts.today +
        expirationCounts.twoDays +
        expirationCounts.fiveDays
    );
  }, [expirationCounts, onAlertCountChange]);

  const priorityLots = useMemo(() => {
    return lotsWithInfo
      .filter((lot) => lot.available > 0 && lot.daysUntilExpiration <= 5)
      .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration)
      .slice(0, 6);
  }, [lotsWithInfo]);

  // Resumo dos registros dos últimos sete dias, sem misturar unidades.
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

      const lot = lots.find((item) => item.id === movement.lot_id);
      const product = products.find((item) => item.id === lot?.product_id);
      const unit = product?.unit || "UN";

      if (!Object.hasOwn(result[movement.movement_type], unit)) return;
      result[movement.movement_type][unit] += Number(movement.quantity);
    });

    return result;
  }, [movements, lots, products]);

  const recoveredSummary = useMemo(() => {
    return {
      UN: lossSummary.VENDIDO.UN + lossSummary.DOADO.UN,
      KG: lossSummary.VENDIDO.KG + lossSummary.DOADO.KG,
      L: lossSummary.VENDIDO.L + lossSummary.DOADO.L,
    };
  }, [lossSummary]);

  const recentMovements = useMemo(() => {
    return movements.slice(0, 3).map((movement) => {
      const lot = lots.find((item) => item.id === movement.lot_id);
      const product = products.find((item) => item.id === lot?.product_id);
      return {
        ...movement,
        productName: product?.name || "Produto não encontrado",
        unit: product?.unit || "UN",
        lotCode: lot?.lot_code || "Lote não informado",
      };
    });
  }, [movements, lots, products]);

  const availableOffers = useMemo(() => {
    return offers
      .filter((offer) => offer.is_active)
      .map((offer) => ({
        ...offer,
        lot: lotsWithInfo.find((lot) => lot.id === offer.lot_id),
      }))
      .filter(
        (offer) =>
          offer.lot &&
          offer.lot.available > 0 &&
          offer.lot.daysUntilExpiration >= 0
      );
  }, [offers, lotsWithInfo]);

  const pausedOffersCount = useMemo(
    () => offers.filter((offer) => !offer.is_active).length,
    [offers]
  );

  const unavailableOffersCount = useMemo(() => {
    return offers.filter((offer) => {
      if (!offer.is_active) return false;
      const lot = lotsWithInfo.find((item) => item.id === offer.lot_id);
      return !lot || lot.available <= 0 || lot.daysUntilExpiration < 0;
    }).length;
  }, [offers, lotsWithInfo]);

  const kpis = [
    {
      label: "Cadastrados",
      value: products.length.toLocaleString("pt-BR"),
      sub: "Produtos no catálogo",
      icon: "package",
      tone: "sage",
    },
    {
      label: "Disponível",
      value: formatUnitSummary(stockTotals),
      sub: "Saldo calculado dos lotes",
      icon: "store",
      tone: "sage",
      compact: true,
    },
    {
      label: "A vencer",
      value: lotsAtRisk.toLocaleString("pt-BR"),
      sub: "Lotes nos próximos 5 dias",
      icon: "calendar-clock",
      tone: "amber",
    },
    {
      label: "Sem estoque",
      value: emptyProducts.length.toLocaleString("pt-BR"),
      sub: "Produtos sem saldo disponível",
      icon: "alert-circle",
      tone: "danger",
    },
  ];

  const attentionCards = [
    {
      key: "expired",
      label: "Vencidos",
      icon: "alert-circle",
      tone: "danger",
      lots: expirationGroups.expired,
    },
    {
      key: "today",
      label: "Vencem hoje",
      icon: "calendar-clock",
      tone: "warning-strong",
      lots: expirationGroups.today,
    },
    {
      key: "twoDays",
      label: "Em até 2 dias",
      icon: "clock",
      tone: "warning-soft",
      lots: expirationGroups.twoDays,
    },
    {
      key: "fiveDays",
      label: "Em até 5 dias",
      icon: "calendar-days",
      tone: "neutral",
      lots: expirationGroups.fiveDays,
    },
  ];

  const offersToShow = availableOffers.slice(0, 5);

  return (
    <div className="dashboard-page">
      <header className="top-header">
        <div className="header-left">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={onOpenSidebar}
            aria-label="Abrir menu"
          >
            <Icon name="menu" size={20} />
          </button>
          <div>
            <h1 className="greeting-title">Olá, {profileName} 👋</h1>
            <p className="greeting-subtitle">
              Visão geral • Veja o que precisa de atenção hoje.
            </p>
          </div>
        </div>

        <div className="header-actions">
          <span className="store-pill">
            <Icon name="store" size={15} />
            <span>Painel administrativo</span>
          </span>
          <span className="date-label">
            {new Date().toLocaleDateString("pt-BR")}
          </span>
          <div className="header-divider" />
          <div className="profile-wrapper" ref={profileWrapperRef}>
            <button
              type="button"
              className="profile-trigger"
              onClick={() => setProfileOpen((open) => !open)}
              aria-expanded={profileOpen}
            >
              {profileAvatar ? (
                <img
                  className="profile-avatar-initials"
                  src={profileAvatar}
                  alt={`Foto de ${profileName}`}
                />
              ) : (
                <span className="profile-avatar-initials">
                  {profileInitials || "F"}
                </span>
              )}

              <span className="profile-info">
                <span className="profile-name">{profileName}</span>
                <span className="profile-role">{profileRole}</span>
              </span>
              <Icon name="chevron-down" size={15} />
            </button>

            {profileOpen && (
              <div className="profile-dropdown">
                <a className="dropdown-item" href="/ofertas">
                  <Icon name="store" size={16} />
                  <span>Ver vitrine pública</span>
                </a>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setProfileOpen(false);
                    loadDashboard();
                  }}
                >
                  <Icon name="refresh-cw" size={16} />
                  <span>Atualizar dados</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setProfileOpen(false);
                    onSignOut();
                  }}
                >
                  <span>↪</span>
                  <span>Sair da conta</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {loadError && <p className="load-error">{loadError}</p>}

      {/* Indicadores principais */}
      <section className="kpi-grid" aria-label="Indicadores principais">
        {kpis.map((kpi) => (
          <article className="kpi-card" key={kpi.label}>
            <div>
              <div className={`kpi-icon-badge ${kpi.tone}`}>
                <Icon name={kpi.icon} size={19} />
              </div>
              <div className="kpi-label">{kpi.label}</div>
              <div className={`kpi-value ${kpi.compact ? "is-summary" : ""}`}>
                {loading ? "..." : kpi.value}
              </div>
            </div>
            <div className="kpi-sub">{kpi.sub}</div>
          </article>
        ))}
      </section>

      {/* Central de atenção */}
      <section
        id="central-atencao"
        className="panel-card section-gap"
        aria-labelledby="central-atencao-title"
      >
        <div className="panel-header">
          <div>
            <h2 id="central-atencao-title" className="panel-title">
              Central de atenção
            </h2>
            <p className="panel-subtitle">
              Distribuição dos lotes por urgência de validade
            </p>
          </div>
          <button
            type="button"
            className="panel-link"
            onClick={() => onNavigate("alerts")}
          >
            <span>Ver todos os alertas</span>
            <Icon name="arrow-right" size={15} />
          </button>
        </div>

        <div className="attention-grid">
          {attentionCards.map((card) => (
            <div className={`attention-box ${card.tone}`} key={card.key}>
              <span className="attention-tag">
                <Icon name={card.icon} size={15} />
                {card.label}
              </span>
              <span className="attention-value">
                {loading ? "..." : `${card.lots.length} lotes`}
              </span>
              <span className="attention-desc">
                {loading
                  ? "Carregando saldo..."
                  : `Saldo: ${formatUnitSummary(summarizeLots(card.lots))}`}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Próximos do vencimento e ofertas na vitrine */}
      <section id="prioritarios" className="content-grid">
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Próximos do vencimento</h2>
              <p className="panel-subtitle">
                Lotes ordenados por prioridade de saída
              </p>
            </div>
            <span className="soft-badge-pill">
              <Icon name="refresh-cw" size={13} />
              Dados do estoque
            </span>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Setor</th>
                  <th>Qtd.</th>
                  <th>Validade</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="table-empty" colSpan="5">
                      Carregando lotes...
                    </td>
                  </tr>
                ) : priorityLots.length > 0 ? (
                  priorityLots.map((lot) => {
                    const status = getExpirationStatus(lot.daysUntilExpiration);
                    const isOffered = availableOffers.some(
                      (offer) => offer.lot_id === lot.id
                    );

                    return (
                      <tr key={lot.id}>
                        <td>
                          <div className="product-cell">
                            <div className="product-icon-box">
                              <Icon name="package" size={18} />
                            </div>
                            <div>
                              <span className="product-name">
                                {lot.product?.name || "Produto não encontrado"}
                                {isOffered && (
                                  <span className="offer-mini-tag">Na vitrine</span>
                                )}
                              </span>
                              <span className="product-meta">
                                {lot.lot_code || "Lote sem código"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>{lot.categoryName}</td>
                        <td>
                          {formatQuantity(lot.available, lot.product?.unit)}
                        </td>
                        <td>{formatDate(lot.expiration_date)}</td>
                        <td>
                          <span className={`status-badge ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="table-empty" colSpan="5">
                      Nenhum lote com vencimento nos próximos cinco dias.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div id="ofertas-ativas" className="panel-card">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Ofertas na vitrine pública</h2>
              <p className="panel-subtitle">
                Produtos ativos, com saldo e validade em dia
              </p>
            </div>
            <a href="/ofertas" className="panel-link">
              <span>Ver como cliente</span>
              <Icon name="external-link" size={14} />
            </a>
          </div>

          {loading ? (
            <div className="empty-state">Carregando ofertas...</div>
          ) : offersToShow.length > 0 ? (
            <div className="offers-list">
              {offersToShow.map((offer) => (
                <article className="offer-row" key={offer.id}>
                  <div className="offer-thumb-placeholder">
                    <Icon name="tag" size={21} />
                  </div>
                  <div className="offer-info">
                    <div className="offer-title">
                      {offer.lot.product?.name || "Produto não encontrado"}
                    </div>
                    <div className="offer-sub">
                      {formatQuantity(
                        offer.lot.available,
                        offer.lot.product?.unit
                      )}
                      {" · Válido até "}
                      {formatDate(offer.lot.expiration_date)}
                    </div>
                  </div>
                  <span className="offer-status-label">Ativa</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              Nenhuma oferta ativa com estoque disponível no momento.
            </div>
          )}

          {availableOffers.length > 5 && (
            <p className="more-offers-note">
              E mais {availableOffers.length - 5} oferta(s) disponível(is).
            </p>
          )}

          <button
            type="button"
            className="btn-primary"
            onClick={() => onNavigate("offers")}
          >
            <Icon name="plus" size={16} />
            <span>Gerenciar ofertas</span>
          </button>
        </div>
      </section>

      {/* Movimentações recentes e destinação */}
      <section id="movimentacoes" className="bottom-grid">
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Movimentações recentes</h2>
              <p className="panel-subtitle">Últimos registros de saída do estoque</p>
            </div>
            <button
              type="button"
              className="panel-link"
              onClick={() => onNavigate("movements")}
            >
              Histórico
            </button>
          </div>

          {loading ? (
            <div className="empty-state">Carregando movimentações...</div>
          ) : recentMovements.length > 0 ? (
            <div className="movements-list">
              {recentMovements.map((movement) => (
                <div className="movement-item" key={movement.id}>
                  <div className="movement-main">
                    <div
                      className="movement-title"
                      title={`${movement.productName} • ${movement.lotCode}`}
                    >
                      {truncateText(movement.productName, 44)}{" "}
                      <span className="movement-code">
                        • {truncateText(movement.lotCode, 20)}
                      </span>
                    </div>
                    <div
                      className="movement-desc"
                      title={movement.notes || "Registro de saída"}
                    >
                      {formatQuantity(movement.quantity, movement.unit)}
                      {movement.notes
                        ? ` • ${truncateText(movement.notes, 64)}`
                        : " • Registro de saída"}
                    </div>
                  </div>
                  <div className="movement-right">
                    <span
                      className={`status-badge ${
                        movement.movement_type === "DESCARTADO"
                          ? "badge-danger"
                          : "badge-safe"
                      }`}
                    >
                      {movementLabels[movement.movement_type] || movement.movement_type}
                    </span>
                    <span className="movement-date">
                      {new Date(movement.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">Nenhuma movimentação registrada.</div>
          )}
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Destinação dos produtos</h2>
              <p className="panel-subtitle">Movimentações dos últimos sete dias</p>
            </div>
          </div>

          <div className="destination-list">
            <div className="destination-item">
              <span className="destination-label">
                <span className="destination-dot sold" />
                Vendido
              </span>
              <span className="destination-value">
                {loading ? "..." : formatUnitSummary(lossSummary.VENDIDO)}
              </span>
            </div>
            <div className="destination-item">
              <span className="destination-label">
                <span className="destination-dot donated" />
                Doado
              </span>
              <span className="destination-value">
                {loading ? "..." : formatUnitSummary(lossSummary.DOADO)}
              </span>
            </div>
            <div className="destination-item">
              <span className="destination-label">
                <span className="destination-dot discarded" />
                Descartado
              </span>
              <span className="destination-value">
                {loading ? "..." : formatUnitSummary(lossSummary.DESCARTADO)}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="panel-link destination-link"
            onClick={() => onNavigate("movements")}
          >
            Ver movimentações <Icon name="arrow-right" size={15} />
          </button>
        </div>
      </section>

      {/* Banner de impacto: mantém o recorte real de sete dias */}
      <section className="impact-banner" aria-labelledby="impacto-title">
        <div className="impact-header">
          <div>
            <h2 id="impacto-title" className="impact-title">
              Redução do desperdício
            </h2>
            <p className="impact-subtitle">
              Resumo operacional das movimentações dos últimos sete dias
            </p>
          </div>
          <span className="impact-pill">
            <Icon name="sprout" size={15} />
            Acompanhamento de destinação
          </span>
        </div>

        <div className="impact-grid">
          <div className="impact-card">
            <div className="impact-card-label">Vendido</div>
            <div className="impact-card-value">
              {loading ? "..." : formatUnitSummary(lossSummary.VENDIDO)}
            </div>
          </div>
          <div className="impact-card">
            <div className="impact-card-label">Doado</div>
            <div className="impact-card-value">
              {loading ? "..." : formatUnitSummary(lossSummary.DOADO)}
            </div>
          </div>
          <div className="impact-card">
            <div className="impact-card-label">Descartado</div>
            <div className="impact-card-value">
              {loading ? "..." : formatUnitSummary(lossSummary.DESCARTADO)}
            </div>
          </div>
          <div className="impact-card highlight-soft">
            <div className="impact-card-label">Recuperado</div>
            <div className="impact-card-value">
              {loading ? "..." : formatUnitSummary(recoveredSummary)}
            </div>
          </div>
        </div>

        <p className="impact-disclaimer">
          Os valores representam movimentações registradas no sistema. A quantidade
          recuperada corresponde à soma de produtos vendidos e doados, não a uma
          estimativa comprovada de desperdício evitado.
        </p>
      </section>
    </div>
  );
}

export default App;
