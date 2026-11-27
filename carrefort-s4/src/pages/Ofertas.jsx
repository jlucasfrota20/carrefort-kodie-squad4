import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import "./Ofertas.css";

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

function Ofertas({ onNavigate, onMenuClick }) {
  const [products, setProducts] = useState([]);
  const [lots, setLots] = useState([]);
  const [movements, setMovements] = useState([]);
  const [offers, setOffers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  // Carrega os dados
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [
      productsResult,
      lotsResult,
      movementsResult,
      offersResult,
    ] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, brand, unit, category_id")
        .order("name"),

      supabase
        .from("lots")
        .select("id, product_id, lot_code, quantity_received, expiration_date")
        .order("expiration_date"),

      supabase
        .from("stock_movements")
        .select("id, lot_id, movement_type, quantity"),

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
      console.error("Erro ao carregar ofertas:", errors);
      setError("Não foi possível carregar os dados das ofertas.");
    }

    setProducts(productsResult.data || []);
    setLots(lotsResult.data || []);
    setMovements(movementsResult.data || []);
    setOffers(offersResult.data || []);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calcula o estoque disponível de cada lote
  const lotsWithInfo = useMemo(() => {
    return lots.map((lot) => {
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
        ...lot,
        product,
        available,
        days,
      };
    });
  }, [lots, products, movements]);

  // Lotes que podem virar ofertas
  const eligibleLots = useMemo(() => {
    return lotsWithInfo.filter((lot) => {
      const alreadyRegistered = offers.some(
        (offer) => offer.lot_id === lot.id
      );

      return (
        lot.available > 0 &&
        lot.days >= 0 &&
        lot.days <= 5 &&
        !offers.some(
          (offer) => offer.lot_id === lot.id && offer.is_active
        )
      );
    });
  }, [lotsWithInfo, offers]);

  // Ofertas cadastradas
  const offersWithInfo = useMemo(() => {
    return offers.map((offer) => ({
      ...offer,
      lot: lotsWithInfo.find(
        (lot) => lot.id === offer.lot_id
      ),
    }));
  }, [offers, lotsWithInfo]);

  const activeOffers = offersWithInfo.filter(
    (offer) => offer.is_active
  );

  const pausedOffers = offersWithInfo.filter(
    (offer) => !offer.is_active
  );

  // Lotes vencidos com saldo disponível
  const expiredLots = lotsWithInfo.filter(
    (lot) => lot.available > 0 && lot.days < 0
  );

  // Cria ou reativa uma oferta
  async function activateOffer(lot) {
    if (lot.days < 0 || lot.available <= 0) {
      setError("Este lote não pode ser colocado em oferta.");
      return;
    }

    setSavingId(lot.id);
    setError("");
    setFeedback("");

    const existingOffer = offers.find(
      (offer) => offer.lot_id === lot.id
    );

    const { error } = existingOffer
      ? await supabase
          .from("offers")
          .update({ is_active: true })
          .eq("id", existingOffer.id)
      : await supabase
          .from("offers")
          .insert({
            lot_id: lot.id,
            is_active: true,
          });

    if (error) {
      console.error("Erro ao ativar oferta:", error);
      setError("Não foi possível ativar esta oferta.");
      setSavingId(null);
      return;
    }

    setFeedback("Oferta ativada com sucesso!");
    await loadData();
    setSavingId(null);
  }

  // Retira uma oferta da vitrine
  async function deactivateOffer(offer) {
    setSavingId(offer.id);
    setError("");
    setFeedback("");

    const { error } = await supabase
      .from("offers")
      .update({ is_active: false })
      .eq("id", offer.id);

    if (error) {
      console.error("Erro ao desativar oferta:", error);
      setError("Não foi possível retirar a oferta.");
      setSavingId(null);
      return;
    }

    setFeedback("Oferta retirada da vitrine.");
    await loadData();
    setSavingId(null);
  }

  function getDeadlineLabel(days) {
    if (days < 0) return "Vencido";
    if (days === 0) return "Vence hoje";
    if (days === 1) return "Vence amanhã";
    return `Vence em ${days} dias`;
  }

  return (
    <div className="offers-page">

            {/* CABEÇALHO */}
      <header className="offers-header">
        <div className="offers-heading">
          <button
            type="button"
            className="offers-menu-button"
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

          <div className="offers-heading-copy">
            <span className="page-eyebrow">
              OPORTUNIDADES DE VENDA
            </span>

            <h1>Ofertas de última hora</h1>

            <p>
              Gerencie os produtos que podem ser disponibilizados
              na vitrine dos clientes.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="button-secondary"
          onClick={loadData}
          disabled={loading}
        >
          ↻ Atualizar
        </button>
      </header>

      {error && <p className="offers-feedback error">{error}</p>}
      {feedback && <p className="offers-feedback success">{feedback}</p>}

      {/* INDICADORES */}
      <section className="offers-metrics">
        <article className="offers-metric">
          <span>Ofertas ativas</span>
          <strong>{loading ? "..." : activeOffers.length}</strong>
        </article>

        <article className="offers-metric">
          <span>Disponíveis para oferta</span>
          <strong>{loading ? "..." : eligibleLots.length}</strong>
        </article>

        <article className="offers-metric offers-expired-metric">
          <span>Produtos vencidos</span>
          <strong>{loading ? "..." : expiredLots.length}</strong>
        </article>

        <article className="offers-metric">
          <span>Ofertas pausadas</span>
          <strong>{loading ? "..." : pausedOffers.length}</strong>
        </article>
      </section>

      {loading ? (
        <p className="offers-empty">Carregando ofertas...</p>
      ) : (
        <>
          {/* OFERTAS ATIVAS */}
          <section className="offers-section">
            <div className="offers-section-header">
              <div>
                <h2>Ofertas ativas</h2>
                <p>Produtos publicados na vitrine dos clientes.</p>
              </div>
            </div>

            {activeOffers.length > 0 ? (
              <div className="offers-grid">
                {activeOffers.map((offer) => {
                  const lot = offer.lot;

                  const unavailable =
                    !lot ||
                    lot.available <= 0 ||
                    lot.days < 0;

                  return (
                    <article className="offer-card" key={offer.id}>
                      <div className="offer-card-top">
                        <span className="offer-icon">%</span>

                        <span
                          className={
                            unavailable
                              ? "offer-status unavailable"
                              : "offer-status active"
                          }
                        >
                          {unavailable
                            ? "Indisponível"
                            : "Na vitrine"}
                        </span>
                      </div>

                      <h3>{lot?.product?.name || "Produto não encontrado"}</h3>

                      <p className="offer-brand">
                        {lot?.product?.brand || "Sem marca informada"}
                      </p>

                      <div className="offer-details">
                        <span>
                          Quantidade disponível
                          <strong>
                            {lot
                              ? formatQuantity(
                                  lot.available,
                                  lot.product?.unit
                                )
                              : "-"}
                          </strong>
                        </span>

                        <span>
                          Código do lote
                          <strong>{lot?.lot_code || "-"}</strong>
                        </span>

                        <span>
                          Validade
                          <strong>
                            {lot ? formatDate(lot.expiration_date) : "-"}
                          </strong>
                        </span>
                      </div>

                      {lot && unavailable && (
                        <p className="offer-warning">
                          {lot.available <= 0
                            ? "Este lote está sem estoque."
                            : "Este lote já venceu e não deve ser comercializado."}
                        </p>
                      )}

                      <button
                        type="button"
                        className="offer-remove-button"
                        disabled={savingId === offer.id}
                        onClick={() => deactivateOffer(offer)}
                      >
                        {savingId === offer.id
                          ? "Atualizando..."
                          : "Retirar da vitrine"}
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="offers-empty">
                <span>◇</span>
                <strong>Nenhuma oferta ativa</strong>
                <p>
                  Selecione produtos disponíveis para começar a montar
                  sua vitrine.
                </p>
              </div>
            )}
          </section>

          {/* LOTES ELEGÍVEIS */}
          <section className="offers-section">
            <div className="offers-section-header">
              <div>
                <h2>Disponíveis para oferta</h2>
                <p>
                  Lotes com estoque e validade de até 5 dias.
                </p>
              </div>
            </div>

            {eligibleLots.length > 0 ? (
              <div className="offers-grid">
                {eligibleLots.map((lot) => {
                  const previousOffer = offers.find(
                    (offer) => offer.lot_id === lot.id
                  );

                  return (
                    <article className="offer-card" key={lot.id}>
                      <div className="offer-card-top">
                        <span className="offer-icon">+</span>

                        <span className="offer-status eligible">
                          {getDeadlineLabel(lot.days)}
                        </span>
                      </div>

                      <h3>{lot.product?.name}</h3>

                      <p className="offer-brand">
                        {lot.product?.brand || "Sem marca informada"}
                      </p>

                      <div className="offer-details">
                        <span>
                          Quantidade disponível
                          <strong>
                            {formatQuantity(
                              lot.available,
                              lot.product?.unit
                            )}
                          </strong>
                        </span>

                        <span>
                          Código do lote
                          <strong>{lot.lot_code || "-"}</strong>
                        </span>

                        <span>
                          Validade
                          <strong>{formatDate(lot.expiration_date)}</strong>
                        </span>
                      </div>

                      <button
                        type="button"
                        className="offer-activate-button"
                        disabled={savingId === lot.id}
                        onClick={() => activateOffer(lot)}
                      >
                        {savingId === lot.id
                          ? "Salvando..."
                          : previousOffer
                          ? "Reativar oferta"
                          : "Publicar na vitrine"}
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="offers-empty">
                <span>✓</span>
                <strong>Nenhum lote disponível para oferta</strong>
                <p>
                  Não há lotes com estoque e validade dentro dos próximos
                  5 dias.
                </p>
              </div>
            )}
          </section>

          {/* OFERTAS PAUSADAS */}
          {pausedOffers.length > 0 && (
            <section className="offers-section">
              <div className="offers-section-header">
                <div>
                  <h2>Ofertas pausadas</h2>
                  <p>Ofertas que foram retiradas da vitrine.</p>
                </div>
              </div>

              <div className="offers-grid">
                {pausedOffers.map((offer) => (
                  <article className="offer-card paused" key={offer.id}>
                    <div className="offer-card-top">
                      <span className="offer-icon">◇</span>
                      <span className="offer-status paused-status">
                        Pausada
                      </span>
                    </div>

                    <h3>{offer.lot?.product?.name || "Produto"}</h3>

                    <p className="offer-brand">
                      Lote: {offer.lot?.lot_code || "-"}
                    </p>

                    <div className="offer-details">
                      <span>
                        Quantidade disponível
                        <strong>
                          {offer.lot
                            ? formatQuantity(
                                offer.lot.available,
                                offer.lot.product?.unit
                              )
                            : "-"}
                        </strong>
                      </span>

                      <span>
                        Validade
                        <strong>
                          {offer.lot
                            ? formatDate(offer.lot.expiration_date)
                            : "-"}
                        </strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      className="offer-activate-button"
                      disabled={
                        savingId === offer.id ||
                        !offer.lot ||
                        offer.lot.available <= 0 ||
                        offer.lot.days < 0
                      }
                      onClick={() => activateOffer(offer.lot)}
                    >
                      {savingId === offer.id
                        ? "Salvando..."
                        : "Reativar oferta"}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* PRODUTOS VENCIDOS */}
          <section className="offers-section">
            <div className="offers-section-header">
              <div>
                <h2>Produtos vencidos</h2>
                <p>
                  Lotes vencidos com quantidade ainda disponível.
                  Apenas para acompanhamento.
                </p>
              </div>

              <span className="expired-label">Não comercializáveis</span>
            </div>

            {expiredLots.length > 0 ? (
              <div className="offers-expired-list">
                {expiredLots.map((lot) => (
                  <div className="expired-product" key={lot.id}>
                    <div>
                      <strong>{lot.product?.name}</strong>
                      <span>
                        Lote: {lot.lot_code || "-"}
                        {" · "}
                        {formatQuantity(lot.available, lot.product?.unit)}
                      </span>
                    </div>

                    <div className="expired-product-date">
                      <span>{formatDate(lot.expiration_date)}</span>
                      <strong>
                        {getDeadlineLabel(lot.days)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="offers-empty">
                <span>✓</span>
                <strong>Nenhum produto vencido com saldo.</strong>
              </div>
            )}
          </section>
        </>
      )}

    </div>
  );
}

export default Ofertas;