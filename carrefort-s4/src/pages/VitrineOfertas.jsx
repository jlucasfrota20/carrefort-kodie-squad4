import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import "./VitrineOfertas.css";

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

function getDeadlineLabel(days) {
  if (days === 0) return "Vence hoje";
  if (days === 1) return "Vence amanhã";
  return `Vence em ${days} dias`;
}

function VitrineOfertas() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");

  // Busca somente ofertas ativas e calcula o saldo real de cada lote.
  const loadOffers = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data: offersData, error: offersError } = await supabase
      .from("offers")
      .select("id, lot_id, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (offersError) {
      console.error("Erro ao carregar ofertas:", offersError);
      setError("Não foi possível carregar as ofertas.");
      setOffers([]);
      setLoading(false);
      return;
    }

    if (!offersData || offersData.length === 0) {
      setOffers([]);
      setLoading(false);
      return;
    }

    const lotIds = offersData.map((offer) => offer.lot_id);

    const [lotsResult, movementsResult] = await Promise.all([
      supabase
        .from("lots")
        .select("id, product_id, quantity_received, expiration_date")
        .in("id", lotIds),

      supabase
        .from("stock_movements")
        .select("lot_id, movement_type, quantity")
        .in("lot_id", lotIds),
    ]);

    if (lotsResult.error || movementsResult.error) {
      console.error(
        "Erro ao carregar lotes das ofertas:",
        lotsResult.error || movementsResult.error
      );
      setError("Não foi possível carregar os produtos das ofertas.");
      setOffers([]);
      setLoading(false);
      return;
    }

    const lotsData = lotsResult.data || [];
    const productIds = [...new Set(lotsData.map((lot) => lot.product_id))];

    const [productsResult, categoriesResult] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, brand, unit, category_id")
        .in("id", productIds),

      supabase
        .from("categories")
        .select("id, name"),
    ]);

    if (productsResult.error || categoriesResult.error) {
      console.error(
        "Erro ao carregar produtos:",
        productsResult.error || categoriesResult.error
      );
      setError("Não foi possível carregar os produtos das ofertas.");
      setOffers([]);
      setLoading(false);
      return;
    }

    const productsData = productsResult.data || [];
    const categoriesData = categoriesResult.data || [];
    const movementData = movementsResult.data || [];

    const formattedOffers = offersData
      .map((offer) => {
        const lot = lotsData.find((item) => item.id === offer.lot_id);
        if (!lot) return null;

        const product = productsData.find(
          (item) => item.id === lot.product_id
        );
        if (!product) return null;

        const category = categoriesData.find(
          (item) => item.id === product.category_id
        );

        const totalMoved = movementData
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
        const days = getDaysUntilExpiration(lot.expiration_date);

        return {
          ...offer,
          lot,
          product,
          category,
          available,
          days,
        };
      })
      // Não exibe lotes vencidos ou sem saldo na vitrine pública.
      .filter(
        (offer) => offer && offer.available > 0 && offer.days >= 0
      )
      .sort((a, b) => a.days - b.days);

    setOffers(formattedOffers);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  // Mostra somente categorias que possuem ofertas disponíveis.
  const availableCategories = useMemo(() => {
    return [...new Set(
      offers
        .map((offer) => offer.category?.name)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [offers]);

  // Pesquisa e filtro por categoria funcionam em conjunto.
  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return offers.filter((offer) => {
      const matchesCategory =
        selectedCategory === "Todas" ||
        offer.category?.name === selectedCategory;

      const matchesSearch =
        !query ||
        [
          offer.product.name,
          offer.product.brand,
          offer.category?.name,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [offers, search, selectedCategory]);

  return (
    <div className="customer-store">
      {/* CABEÇALHO DA VITRINE */}
      <header className="storefront-header">
        <div className="storefront-header-inner">
          <a className="store-brand" href="/" aria-label="Carrefort - voltar ao painel">
            <span className="store-brand-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path d="M12.75 4.5C9.06 4.5 5.94 6.91 4.88 10.25C6.46 9.45 8.24 9 10.12 9H14.25C14.66 9 15 9.34 15 9.75C15 10.16 14.66 10.5 14.25 10.5H10.12C9.34 10.5 8.59 10.59 7.86 10.75C6.65 11.03 5.52 11.52 4.52 12.19C1.79 14.01 0 17.11 0 20.62V21.38C0 22 0.5 22.5 1.12 22.5C1.75 22.5 2.25 22 2.25 21.38V20.62C2.25 18.34 3.22 16.29 4.77 14.85C5.7 18.39 8.92 21 12.75 21H12.8C19 20.97 24 14.86 24 7.34C24 5.34 23.65 3.45 23.01 1.73C22.89 1.41 22.41 1.42 22.25 1.73C21.37 3.38 19.63 4.5 17.62 4.5H12.75Z" />
              </svg>
            </span>
            <span className="store-brand-copy">
              <strong>Carrefort</strong>
              <span>Ofertas de última hora</span>
            </span>
          </a>

          <div className="store-header-actions">
            <a className="store-login-button" href="/login">
              Entrar
            </a>
          </div>
        </div>
      </header>

      <main className="storefront-container">
        {/* DESTAQUE E FILTROS POR CATEGORIA */}
        <section className="storefront-hero">
          <div className="storefront-hero-copy">
            <span className="store-hero-tag">
              <span aria-hidden="true">✦</span>
              Menos desperdício, mais economia
            </span>
            <h1>Economize e evite o desperdício!</h1>
            <p>
              Aproveite os produtos disponíveis com validade próxima e ajude
              a reduzir o desperdício de alimentos.
            </p>
            <span className="store-hero-count">
              {loading
                ? "Carregando ofertas..."
                : `${offers.length} ${offers.length === 1 ? "oferta disponível" : "ofertas disponíveis"}`}
            </span>
          </div>

          <div className="store-category-filters" aria-label="Filtrar ofertas por categoria">
            <button
              type="button"
              className={selectedCategory === "Todas" ? "active" : ""}
              onClick={() => setSelectedCategory("Todas")}
              aria-pressed={selectedCategory === "Todas"}
            >
              Todas
            </button>

            {availableCategories.map((category) => (
              <button
                type="button"
                key={category}
                className={selectedCategory === category ? "active" : ""}
                onClick={() => setSelectedCategory(category)}
                aria-pressed={selectedCategory === category}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        {/* LISTA DE OFERTAS */}
        <section className="storefront-list-section">
          <div className="storefront-list-heading">
            <div>
              <span className="store-section-eyebrow">VITRINE PÚBLICA</span>
              <h2>Ofertas disponíveis</h2>
              <p>Confira a disponibilidade e a validade de cada produto.</p>
            </div>

            <button
              type="button"
              className="store-refresh-button"
              onClick={loadOffers}
              disabled={loading}
            >
              <span aria-hidden="true">↻</span>
              {loading ? "Atualizando..." : "Atualizar ofertas"}
            </button>
          </div>

          <label className="store-search" htmlFor="store-offer-search">
            <span aria-hidden="true">⌕</span>
            <input
              id="store-offer-search"
              type="search"
              placeholder="Buscar produto ou categoria..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          {error && (
            <div className="store-message-error" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="store-empty-state" role="status">
              <span className="store-empty-icon" aria-hidden="true">⌛</span>
              <strong>Carregando ofertas</strong>
              <p>Estamos buscando os produtos disponíveis.</p>
            </div>
          ) : filteredOffers.length > 0 ? (
            <div className="storefront-grid">
              {filteredOffers.map((offer) => (
                <article className="store-offer-card" key={offer.id}>
                  <div className="store-offer-art" aria-hidden="true">
                    <span className="store-offer-art-orbit store-offer-art-orbit-one" />
                    <span className="store-offer-art-orbit store-offer-art-orbit-two" />
                    <svg className="store-offer-leaf" viewBox="0 0 64 64">
                      <path d="M53 9C35 9 17 14 12 31c-3 10 3 19 13 19 17 0 26-18 28-41Z" />
                      <path d="M10 55c8-14 20-23 34-32" />
                    </svg>
                    <span className="store-offer-art-label">Carrefort</span>
                    <span className="store-offer-badge">Oferta ativa</span>
                  </div>

                  <div className="store-offer-card-body">
                    {offer.category && (
                      <span className="store-offer-category">
                        {offer.category.name}
                      </span>
                    )}

                    <h3 title={offer.product.name}>{offer.product.name}</h3>

                    {offer.product.brand && (
                      <p className="store-offer-brand">{offer.product.brand}</p>
                    )}

                    <div className="store-offer-details">
                      <div>
                        <span>Disponibilidade</span>
                        <strong>
                          {formatQuantity(offer.available, offer.product.unit)}
                        </strong>
                      </div>
                      <div>
                        <span>Validade</span>
                        <strong>{formatDate(offer.lot.expiration_date)}</strong>
                      </div>
                    </div>

                    <span className={`store-offer-deadline ${offer.days === 0 ? "today" : ""}`}>
                      {getDeadlineLabel(offer.days)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="store-empty-state">
              <span className="store-empty-icon" aria-hidden="true">◇</span>
              <strong>
                {search || selectedCategory !== "Todas"
                  ? "Nenhuma oferta encontrada"
                  : "Nenhuma oferta disponível no momento"}
              </strong>
              <p>
                {search || selectedCategory !== "Todas"
                  ? "Experimente outro termo ou selecione uma categoria diferente."
                  : "Volte em breve para conferir novas oportunidades."}
              </p>
              {(search || selectedCategory !== "Todas") && (
                <button
                  type="button"
                  className="store-clear-filters"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("Todas");
                  }}
                >
                  Limpar pesquisa e filtros
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="storefront-footer">
        <strong>Carrefort</strong>
        <span>Cada produto aproveitado é comida que não vai para o lixo.</span>
      </footer>
    </div>
  );
}

export default VitrineOfertas;
