
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

function VitrineOfertas() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Busca somente ofertas ativas
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

    // Busca os lotes das ofertas
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

    // Busca produtos e categorias
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

    // Calcula o saldo disponível de cada lote
    const formattedOffers = offersData
      .map((offer) => {
        const lot = lotsData.find(
          (item) => item.id === offer.lot_id
        );

        if (!lot) return null;

        const product = productsData.find(
          (item) => item.id === lot.product_id
        );

        if (!product) return null;

        const category = categoriesData.find(
          (item) => item.id === product.category_id
        );

        const totalMoved = (movementsResult.data || [])
          .filter(
            (movement) =>
              movement.lot_id === lot.id &&
              ["VENDIDO", "DOADO", "DESCARTADO"].includes(
                movement.movement_type
              )
          )
          .reduce(
            (total, movement) =>
              total + Number(movement.quantity),
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
      // Nunca mostrar lote vencido ou sem saldo ao cliente
      .filter(
        (offer) =>
          offer &&
          offer.available > 0 &&
          offer.days >= 0
      )
      .sort((a, b) => a.days - b.days);

    setOffers(formattedOffers);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  // Pesquisa de ofertas
  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return offers;

    return offers.filter((offer) =>
      [
        offer.product.name,
        offer.product.brand,
        offer.category?.name,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [offers, search]);

  function getDeadlineLabel(days) {
    if (days === 0) return "Vence hoje";
    if (days === 1) return "Vence amanhã";
    return `Vence em ${days} dias`;
  }

  return (
    <div className="customer-store">

      {/* CABEÇALHO */}
      <header className="store-header">
        <div className="store-brand">
          <div className="store-brand-icon">C</div>

          <div>
            <strong>CARREFORT</strong>
            <span>OFERTAS DO SUPERMERCADO</span>
          </div>
        </div>

        <span className="store-public-label">
          Vitrine de ofertas
        </span>
      </header>

      {/* DESTAQUE */}
      <section className="store-hero">
        <span className="store-eyebrow">
          APROVEITE AS OPORTUNIDADES
        </span>

        <h1>Ofertas de última hora</h1>

        <p>
          Produtos selecionados para você aproveitar antes
          que o estoque acabe.
        </p>

        <span className="store-hero-count">
          {loading
            ? "Carregando ofertas..."
            : `${offers.length} oferta(s) disponível(is)`}
        </span>
      </section>

      {/* LISTAGEM */}
      <main className="store-content">

        <div className="store-list-header">
          <div>
            <h2>Ofertas disponíveis</h2>
            <p>Confira os produtos disponíveis no supermercado.</p>
          </div>

          <button
            type="button"
            className="store-refresh"
            onClick={loadOffers}
            disabled={loading}
          >
            ↻ Atualizar
          </button>
        </div>

        <div className="store-search">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Buscar produto ou categoria..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {error && (
          <div className="store-message error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="store-empty">
            Carregando ofertas...
          </div>
        ) : filteredOffers.length > 0 ? (
          <div className="store-grid">
            {filteredOffers.map((offer) => (
              <article className="store-product-card" key={offer.id}>

                <div className="store-product-visual">
                  <span className="store-product-symbol">%</span>
                  <span className="store-product-badge">
                    Oferta
                  </span>
                </div>

                <div className="store-product-info">

                  {offer.category && (
                    <span className="store-category">
                      {offer.category.name}
                    </span>
                  )}

                  <h3>{offer.product.name}</h3>

                  <p className="store-brand-name">
                    {offer.product.brand || "Produto disponível"}
                  </p>

                  <div className="store-product-details">
                    <div>
                      <span>Disponibilidade</span>
                      <strong>
                        {formatQuantity(
                          offer.available,
                          offer.product.unit
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Validade</span>
                      <strong>
                        {formatDate(offer.lot.expiration_date)}
                      </strong>
                    </div>
                  </div>

                  <span className="store-deadline">
                    {getDeadlineLabel(offer.days)}
                  </span>

                  <div className="store-availability">
                    Disponível para consulta na loja
                  </div>

                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="store-empty">
            <span>◇</span>
            <strong>
              {search
                ? "Nenhuma oferta encontrada"
                : "Nenhuma oferta disponível no momento"}
            </strong>
            <p>
              {search
                ? "Tente pesquisar outro produto ou categoria."
                : "Volte em breve para conferir novas oportunidades."}
            </p>
          </div>
        )}

      </main>

      {/* RODAPÉ */}
      <footer className="store-footer">
        <strong>CARREFORT</strong>
        <span>Menos desperdício, mais oportunidades.</span>
      </footer>

    </div>
  );
}

export default VitrineOfertas;
