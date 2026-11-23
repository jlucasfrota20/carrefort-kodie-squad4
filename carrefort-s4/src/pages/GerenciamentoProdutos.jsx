import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import "./GerenciamentoProdutos.css";

const emptyProduct = {
  name: "",
  category_id: "",
  brand: "",
  barcode: "",
  unit: "UN",
};

const emptyLot = {
  product_id: "",
  lot_code: "",
  quantity_received: "",
  unit: "UN",
  expiration_date: "",
};

const emptyMovement = {
  lot_id: "",
  movement_type: "VENDIDO",
  quantity: "",
  notes: "",
};

const emptyFilters = {
  category: "",
  movement: "",
  stock: "",
  validity: "",
};

const movementLabels = {
  VENDIDO: "Vendido",
  DOADO: "Doado",
  DESCARTADO: "Descartado",
};

const validityLabels = {
  expired: "Vencido",
  today: "Vence hoje",
  twoDays: "Em até 2 dias",
  fiveDays: "Em até 5 dias",
  valid: "Dentro da validade",
};

function getValidityStatus(date) {
  const [year, month, day] = date.split("-").map(Number);
  const expiration = new Date(year, month - 1, day);
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const days = Math.round(
    (expiration.getTime() - today.getTime()) / 86400000
  );

  if (days < 0) return "expired";
  if (days === 0) return "today";
  if (days <= 2) return "twoDays";
  if (days <= 5) return "fiveDays";

  return "valid";
}

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatQuantity(value, unit) {
  return `${Number(value).toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  })} ${unit || "UN"}`;
}

function GerenciamentoProdutos({ initialTab = "stock", showTabs = true }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [lots, setLots] = useState([]);
  const [movements, setMovements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modal, setModal] = useState(null);
  const [registerStep, setRegisterStep] = useState("choose");

  const [editingProduct, setEditingProduct] = useState(null);
  const [editingLot, setEditingLot] = useState(null);

  const [productForm, setProductForm] = useState(emptyProduct);
  const [lotForm, setLotForm] = useState(emptyLot);
  const [movementForm, setMovementForm] = useState(emptyMovement);

  const [lotSearch, setLotSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(emptyFilters);

  const [feedback, setFeedback] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  // Sincroniza a seção selecionada no menu lateral.
  useEffect(() => {
    setActiveTab(initialTab);
    setSearch("");
    setFilters({ ...emptyFilters });
    setShowFilters(false);
  }, [initialTab]);

  // Busca os dados do estoque
  const loadData = useCallback(async () => {
    setLoading(true);

    const [
      categoriesResult,
      productsResult,
      lotsResult,
      movementsResult,
    ] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name")
        .order("name"),

      supabase
        .from("products")
        .select("id, name, category_id, brand, barcode, unit")
        .order("name"),

      supabase
        .from("lots")
        .select("id, product_id, lot_code, quantity_received, expiration_date")
        .order("expiration_date"),

      supabase
        .from("stock_movements")
        .select("id, lot_id, movement_type, quantity, notes, created_at")
        .order("created_at", { ascending: false }),
    ]);

    const errors = [
      categoriesResult.error,
      productsResult.error,
      lotsResult.error,
      movementsResult.error,
    ].filter(Boolean);

    if (errors.length) {
      console.error("Erro ao carregar estoque:", errors);
      setLoadError("Erro ao carregar os dados.");
    } else {
      setLoadError("");
    }

    setCategories(categoriesResult.data || []);
    setProducts(productsResult.data || []);
    setLots(lotsResult.data || []);
    setMovements(movementsResult.data || []);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calcula as quantidades e a situação dos lotes
  const lotsWithInfo = useMemo(() => {
    return lots.map((lot) => {
      const lotMovements = movements.filter(
        (movement) => movement.lot_id === lot.id
      );

      const getTotal = (type) =>
        lotMovements
          .filter((movement) => movement.movement_type === type)
          .reduce(
            (total, movement) => total + Number(movement.quantity),
            0
          );

      const sold = getTotal("VENDIDO");
      const donated = getTotal("DOADO");
      const discarded = getTotal("DESCARTADO");

      const available =
        Number(lot.quantity_received) - sold - donated - discarded;

      return {
        ...lot,
        product: products.find(
          (product) => product.id === lot.product_id
        ),
        movements: lotMovements,
        sold,
        donated,
        discarded,
        available,
        validity: getValidityStatus(lot.expiration_date),
      };
    });
  }, [lots, movements, products]);

  const availableLots = lotsWithInfo.filter(
    (lot) => lot.available > 0
  ).length;

  const emptyLotsCount = lotsWithInfo.filter(
    (lot) => lot.available <= 0
  ).length;

  // Pesquisa geral
  function matchesSearch(values) {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return values
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  }

  const filteredProducts = products.filter((product) => {
    const matchesText = matchesSearch([
      product.name,
      product.brand,
      product.barcode,
    ]);

    const matchesCategory =
      !filters.category || product.category_id === filters.category;

    return matchesText && matchesCategory;
  });

  const filteredLots = lotsWithInfo.filter((lot) => {
    const matchesText = matchesSearch([
      lot.product?.name,
      lot.product?.brand,
      lot.product?.barcode,
      lot.lot_code,
    ]);

    const matchesCategory =
      !filters.category ||
      lot.product?.category_id === filters.category;

    const matchesMovement =
      !filters.movement ||
      lot.movements.some(
        (movement) => movement.movement_type === filters.movement
      );

    const matchesStock =
      !filters.stock ||
      (filters.stock === "available" && lot.available > 0) ||
      (filters.stock === "empty" && lot.available <= 0);

    const matchesValidity =
      !filters.validity || lot.validity === filters.validity;

    return (
      matchesText &&
      matchesCategory &&
      matchesMovement &&
      matchesStock &&
      matchesValidity
    );
  });

  const filteredMovements = movements.filter((movement) => {
    const lot = lots.find((item) => item.id === movement.lot_id);
    const product = products.find(
      (item) => item.id === lot?.product_id
    );

    const matchesText = matchesSearch([
      product?.name,
      product?.brand,
      product?.barcode,
      lot?.lot_code,
      movement.movement_type,
      movement.notes,
    ]);

    const matchesCategory =
      !filters.category || product?.category_id === filters.category;

    const matchesMovement =
      !filters.movement ||
      movement.movement_type === filters.movement;

    return matchesText && matchesCategory && matchesMovement;
  });

  // Filtros
  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function clearFilters() {
    setFilters({ ...emptyFilters });
    setSearch("");
  }

  function changeTab(tab) {
    setActiveTab(tab);
    clearFilters();
  }

  // Abre a central de registro
  function openRegister() {
    setRegisterStep("choose");
    setEditingProduct(null);
    setEditingLot(null);
    setProductForm({ ...emptyProduct });
    setLotForm({ ...emptyLot });
    setLotSearch("");
    setModalMessage("");
    setModal("register");
  }

  // Abre o formulário de movimentação
  function openMovementModal() {
    setMovementForm({ ...emptyMovement });
    setModalMessage("");
    setFeedback("");
    setModal("movement");
  }

  // Escolhe o tipo de cadastro
  function chooseRegistration(type) {
    setRegisterStep(type);
    setModalMessage("");
  }

  // Abre os formulários para edição
  function openProductModal(product) {
    setEditingProduct(product);

    setProductForm({
      name: product.name,
      category_id: product.category_id,
      brand: product.brand || "",
      barcode: product.barcode || "",
      unit: product.unit || "UN",
    });

    setModalMessage("");
    setModal("product");
  }

  function openLotModal(lot) {
    setEditingLot(lot);

    const product = products.find(
      (item) => item.id === lot.product_id
    );

    setLotForm({
      product_id: lot.product_id,
      lot_code: lot.lot_code || "",
      quantity_received: lot.quantity_received,
      unit: product?.unit || "UN",
      expiration_date: lot.expiration_date,
    });

    setLotSearch(product?.name || "");
    setModalMessage("");
    setModal("lot");
  }

  function closeModal() {
    setModal(null);
    setRegisterStep("choose");
    setEditingProduct(null);
    setEditingLot(null);
    setProductForm({ ...emptyProduct });
    setLotForm({ ...emptyLot });
    setMovementForm({ ...emptyMovement });
    setLotSearch("");
    setModalMessage("");
  }

  function backToRegister() {
    setRegisterStep("choose");
    setProductForm({ ...emptyProduct });
    setLotForm({ ...emptyLot });
    setLotSearch("");
    setModalMessage("");
  }

  function clearModalForm() {
    if (
      modal === "product" ||
      (modal === "register" && registerStep === "product")
    ) {
      setProductForm({ ...emptyProduct });
    }

    if (
      modal === "lot" ||
      (modal === "register" && registerStep === "lot")
    ) {
      setLotForm({ ...emptyLot });
      setLotSearch("");
    }

    if (modal === "movement") {
      setMovementForm({ ...emptyMovement });
    }

    setModalMessage("");
  }

  // Campos dos formulários
  function handleProductChange(event) {
    const { name, value } = event.target;

    setProductForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleLotChange(event) {
    const { name, value } = event.target;

    setLotForm((prev) => {
      if (name === "unit") {
        return {
          ...prev,
          unit: value,
          quantity_received:
            value === "UN" && !Number.isInteger(Number(prev.quantity_received))
              ? ""
              : prev.quantity_received,
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  }

  function handleMovementChange(event) {
    const { name, value } = event.target;

    setMovementForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "lot_id" ? { quantity: "" } : {}),
    }));
  }

  // Produtos encontrados na busca do lote
  const lotProductResults = products.filter((product) => {
    const query = lotSearch.trim().toLowerCase();

    if (!query) return true;

    const category = categories.find(
      (item) => item.id === product.category_id
    );

    return [
      product.name,
      product.brand,
      product.barcode,
      category?.name,
    ]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  }).slice(0, 8);

  const selectedProduct = products.find(
    (product) => product.id === lotForm.product_id
  );

  const selectedMovementLot = lotsWithInfo.find(
    (lot) => lot.id === movementForm.lot_id
  );

  // Mantem a unidade do produto consistente entre todos os lotes.
  const selectedProductHasLots = selectedProduct
    ? lots.some((lot) => lot.product_id === selectedProduct.id)
    : false;

  const editingProductHasLots =
    editingProduct &&
    lots.some((lot) => lot.product_id === editingProduct.id);

  const lotHasMovements =
    editingLot &&
    movements.some((movement) => movement.lot_id === editingLot.id);

  function selectLotProduct(product) {
    setLotForm((prev) => ({
      ...prev,
      product_id: product.id,
      unit: product.unit || "UN",
      quantity_received: "",
    }));

    setLotSearch(product.name);
    setModalMessage("");
  }

  function clearLotProduct() {
    setLotForm((prev) => ({
      ...prev,
      product_id: "",
      unit: "UN",
      quantity_received: "",
    }));

    setLotSearch("");
  }

  function getCategoryName(categoryId) {
    return categories.find(
      (category) => category.id === categoryId
    )?.name || "-";
  }

  // Cadastra ou edita produto
  async function handleProductSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setModalMessage("");

    const product = {
      name: productForm.name.trim(),
      category_id: productForm.category_id,
      brand: productForm.brand.trim() || null,
      barcode: productForm.barcode.trim() || null,
      unit: productForm.unit,
    };

    const wasEditing = Boolean(editingProduct);

    const { error } = wasEditing
      ? await supabase
          .from("products")
          .update(product)
          .eq("id", editingProduct.id)
      : await supabase
          .from("products")
          .insert(product);

    if (error) {
      console.error("Erro ao salvar produto:", error);

      setModalMessage(
        error.code === "23505"
          ? "Esse código de barras já está cadastrado."
          : "Não foi possível salvar o produto."
      );

      setSaving(false);
      return;
    }

    closeModal();
    await loadData();

    setFeedback(
      wasEditing ? "Produto atualizado." : "Produto cadastrado."
    );

    setSaving(false);
  }

  // Cadastra ou edita lote
  async function handleLotSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setModalMessage("");

    const quantity = Number(lotForm.quantity_received);
    const selected = products.find(
      (product) => product.id === lotForm.product_id
    );

    if (!selected || !Number.isFinite(quantity) || quantity <= 0) {
      setModalMessage("Selecione um produto e informe uma quantidade válida.");
      setSaving(false);
      return;
    }

    if (lotForm.unit === "UN" && !Number.isInteger(quantity)) {
      setModalMessage(
        "A quantidade deve ser um número inteiro para produtos por unidade."
      );
      setSaving(false);
      return;
    }

    // A unidade é definida uma vez por produto. Só pode ser ajustada
    // antes do primeiro lote para não misturar UN, KG e L no mesmo estoque.
    if (selected.unit !== lotForm.unit) {
      const hasExistingLots = lots.some(
        (lot) => lot.product_id === selected.id
      );

      if (hasExistingLots) {
        setModalMessage(
          "Este produto já possui lotes. Altere a unidade no cadastro somente antes do primeiro recebimento."
        );
        setSaving(false);
        return;
      }

      const { error: unitError } = await supabase
        .from("products")
        .update({ unit: lotForm.unit })
        .eq("id", selected.id);

      if (unitError) {
        console.error("Erro ao atualizar unidade do produto:", unitError);
        setModalMessage("Não foi possível atualizar a unidade do produto.");
        setSaving(false);
        return;
      }
    }

    if (editingLot) {
      const totalMoved = movements
        .filter((movement) => movement.lot_id === editingLot.id)
        .reduce(
          (total, movement) => total + Number(movement.quantity),
          0
        );

      if (quantity < totalMoved) {
        setModalMessage(
          `A quantidade recebida não pode ser menor que as saídas já registradas (${totalMoved}).`
        );
        setSaving(false);
        return;
      }
    }

    const lot = {
      product_id: lotForm.product_id,
      lot_code: lotForm.lot_code.trim() || null,
      quantity_received: quantity,
      expiration_date: lotForm.expiration_date,
    };

    const wasEditing = Boolean(editingLot);

    const { error } = wasEditing
      ? await supabase
          .from("lots")
          .update(lot)
          .eq("id", editingLot.id)
      : await supabase
          .from("lots")
          .insert(lot);

    if (error) {
      console.error("Erro ao salvar lote:", error);
      setModalMessage("Não foi possível salvar o lote.");
      setSaving(false);
      return;
    }

    closeModal();
    await loadData();

    setFeedback(
      wasEditing ? "Lote atualizado." : "Lote cadastrado."
    );

    setSaving(false);
  }

  // Registra vendido, doado ou descartado
  async function handleMovementSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setModalMessage("");

    const lot = lotsWithInfo.find(
      (item) => item.id === movementForm.lot_id
    );

    const quantity = Number(movementForm.quantity);
    const movementType = movementForm.movement_type;

    if (!lot) {
      setModalMessage("Selecione um lote válido.");
      setSaving(false);
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setModalMessage("Informe uma quantidade válida.");
      setSaving(false);
      return;
    }

    if (!["VENDIDO", "DOADO", "DESCARTADO"].includes(movementType)) {
      setModalMessage("Selecione um tipo de movimentação válido.");
      setSaving(false);
      return;
    }

    if (lot.product?.unit === "UN" && !Number.isInteger(quantity)) {
      setModalMessage(
        "A quantidade deve ser um número inteiro para produtos por unidade."
      );
      setSaving(false);
      return;
    }

    if (quantity > lot.available) {
      setModalMessage(
        `A quantidade não pode ser maior que o saldo disponível (${formatQuantity(
          lot.available,
          lot.product?.unit
        )}).`
      );
      setSaving(false);
      return;
    }

    // Lotes vencidos só podem ser descartados.
    if (lot.validity === "expired" && movementType !== "DESCARTADO") {
      setModalMessage(
        "Este lote está vencido. Somente é permitido registrar o descarte."
      );
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("stock_movements")
      .insert({
        lot_id: lot.id,
        movement_type: movementType,
        quantity,
        notes: movementForm.notes.trim() || null,
      });

    if (error) {
      console.error("Erro ao registrar movimentação:", error);
      setModalMessage("Não foi possível registrar a movimentação.");
      setSaving(false);
      return;
    }

    closeModal();
    await loadData();

    setFeedback("Movimentação registrada com sucesso!");
    setSaving(false);
  }

  const showProductForm =
    modal === "product" ||
    (modal === "register" && registerStep === "product");

  const showLotForm =
    modal === "lot" ||
    (modal === "register" && registerStep === "lot");

  const pageInfo = {
    stock: {
      title: "Estoque",
      description: "Acompanhe lotes, quantidades disponíveis e validades.",
    },
    products: {
      title: "Produtos",
      description: "Consulte e gerencie os produtos cadastrados.",
    },
    movements: {
      title: "Movimentações",
      description: "Acompanhe as saídas registradas no estoque.",
    },
  };

  const currentPage = pageInfo[activeTab] || pageInfo.stock;

  return (
    <div className="inventory-page">
      <header className="inventory-header">
        <div>
          <h1>{currentPage.title}</h1>
          <p>{currentPage.description}</p>
        </div>

        <button
          type="button"
          className="button-primary register-button"
          onClick={
            activeTab === "movements"
              ? openMovementModal
              : openRegister
          }
        >
          {activeTab === "movements"
            ? "+ Registrar movimentação"
            : "+ Registrar"}
        </button>
      </header>

      {activeTab === "stock" && (
        <div className="inventory-stats">
          <div className="stat-card">
            <span>Produtos</span>
            <strong>{products.length}</strong>
          </div>

          <div className="stat-card">
            <span>Lotes</span>
            <strong>{lots.length}</strong>
          </div>

          <div className="stat-card">
            <span>Lotes disponíveis</span>
            <strong>{availableLots}</strong>
          </div>

          <div className="stat-card">
            <span>Sem estoque</span>
            <strong>{emptyLotsCount}</strong>
          </div>
        </div>
      )}

      {showTabs && (
        <div className="inventory-tabs">
          <button
            type="button"
            className={activeTab === "stock" ? "active" : ""}
            onClick={() => changeTab("stock")}
          >
            Estoque
          </button>

          <button
            type="button"
            className={activeTab === "products" ? "active" : ""}
            onClick={() => changeTab("products")}
          >
            Produtos
          </button>

          <button
            type="button"
            className={activeTab === "movements" ? "active" : ""}
            onClick={() => changeTab("movements")}
          >
            Movimentações
          </button>
        </div>
      )}

      <div className="inventory-toolbar">
        <input
          type="text"
          placeholder="Pesquisar produto, marca, código ou lote..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <button
          type="button"
          className="button-secondary"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? "Fechar filtros" : "Filtros"}
        </button>
      </div>

      {showFilters && (
        <div className="filter-panel">
          <label>
            Categoria
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          {(activeTab === "stock" || activeTab === "movements") && (
            <label>
              Movimentação
              <select
                name="movement"
                value={filters.movement}
                onChange={handleFilterChange}
              >
                <option value="">Todas</option>
                <option value="VENDIDO">Vendido</option>
                <option value="DOADO">Doado</option>
                <option value="DESCARTADO">Descartado</option>
              </select>
            </label>
          )}

          {activeTab === "stock" && (
            <>
              <label>
                Estoque
                <select
                  name="stock"
                  value={filters.stock}
                  onChange={handleFilterChange}
                >
                  <option value="">Todos</option>
                  <option value="available">Disponível</option>
                  <option value="empty">Fora de estoque</option>
                </select>
              </label>

              <label>
                Validade
                <select
                  name="validity"
                  value={filters.validity}
                  onChange={handleFilterChange}
                >
                  <option value="">Todas</option>
                  <option value="expired">Vencido</option>
                  <option value="today">Vence hoje</option>
                  <option value="twoDays">Em até 2 dias</option>
                  <option value="fiveDays">Em até 5 dias</option>
                  <option value="valid">Dentro da validade</option>
                </select>
              </label>
            </>
          )}

          <button
            type="button"
            className="button-text"
            onClick={clearFilters}
          >
            Limpar filtros
          </button>
        </div>
      )}

      {feedback && <p className="feedback">{feedback}</p>}
      {loadError && <p className="feedback error">{loadError}</p>}

      {loading ? (
        <p className="empty-state">Carregando...</p>
      ) : (
        <>
          {activeTab === "stock" && (
            <div className="table-container">
              <h2>Estoque por lote</h2>

              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Lote</th>
                    <th>Recebido</th>
                    <th>Vendido</th>
                    <th>Doado</th>
                    <th>Descartado</th>
                    <th>Disponível</th>
                    <th>Validade</th>
                    <th>Situação</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLots.map((lot) => (
                    <tr key={lot.id}>
                      <td>{lot.product?.name || "-"}</td>
                      <td>{lot.lot_code || "-"}</td>
                      <td>
                        {formatQuantity(
                          lot.quantity_received,
                          lot.product?.unit
                        )}
                      </td>
                      <td>{formatQuantity(lot.sold, lot.product?.unit)}</td>
                      <td>{formatQuantity(lot.donated, lot.product?.unit)}</td>
                      <td>
                        {formatQuantity(lot.discarded, lot.product?.unit)}
                      </td>
                      <td>
                        {formatQuantity(lot.available, lot.product?.unit)}
                      </td>
                      <td>{formatDate(lot.expiration_date)}</td>
                      <td>
                        <span className={`status status-${lot.validity}`}>
                          {validityLabels[lot.validity]}
                        </span>
                        <span
                          className={`status ${
                            lot.available > 0
                              ? "status-available"
                              : "status-empty"
                          }`}
                        >
                          {lot.available > 0
                            ? "Disponível"
                            : "Fora de estoque"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => openLotModal(lot)}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredLots.length === 0 && (
                <p className="empty-state">Nenhum lote encontrado.</p>
              )}
            </div>
          )}

          {activeTab === "products" && (
            <div className="table-container">
              <h2>Produtos cadastrados</h2>

              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Categoria</th>
                    <th>Marca</th>
                    <th>Código de barras</th>
                    <th>Unidade</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{getCategoryName(product.category_id)}</td>
                      <td>{product.brand || "-"}</td>
                      <td>{product.barcode || "-"}</td>
                      <td>{product.unit}</td>
                      <td>
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => openProductModal(product)}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredProducts.length === 0 && (
                <p className="empty-state">Nenhum produto encontrado.</p>
              )}
            </div>
          )}

          {activeTab === "movements" && (
            <div className="table-container">
              <h2>Movimentações</h2>

              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Produto</th>
                    <th>Lote</th>
                    <th>Tipo</th>
                    <th>Quantidade</th>
                    <th>Observação</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMovements.map((movement) => {
                    const lot = lots.find(
                      (item) => item.id === movement.lot_id
                    );

                    const product = products.find(
                      (item) => item.id === lot?.product_id
                    );

                    return (
                      <tr key={movement.id}>
                        <td>
                          {new Date(movement.created_at).toLocaleString("pt-BR")}
                        </td>
                        <td>{product?.name || "-"}</td>
                        <td>{lot?.lot_code || "-"}</td>
                        <td>
                          <span
                            className={`status status-${movement.movement_type.toLowerCase()}`}
                          >
                            {movementLabels[movement.movement_type]}
                          </span>
                        </td>
                        <td>
                          {formatQuantity(movement.quantity, product?.unit)}
                        </td>
                        <td>{movement.notes || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredMovements.length === 0 && (
                <p className="empty-state">
                  Nenhuma movimentação encontrada.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Central de registro */}
      {modal === "register" && registerStep === "choose" && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="modal register-modal">
            <div className="modal-header">
              <div>
                <h2>Registrar</h2>
                <p>Escolha o que deseja adicionar ao estoque.</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <div className="register-options">
              <button
                type="button"
                className="register-option"
                onClick={() => chooseRegistration("product")}
              >
                <span className="register-option-icon">+</span>
                <strong>Produto</strong>
                <span>Adicionar um novo produto ao catálogo.</span>
              </button>

              <button
                type="button"
                className="register-option"
                onClick={() => chooseRegistration("lot")}
                disabled={products.length === 0}
              >
                <span className="register-option-icon">▦</span>
                <strong>Lote</strong>
                <span>Adicionar quantidade e validade a um produto.</span>
              </button>
            </div>

            <div className="future-features">
              <h3>Mais opções</h3>

              <div className="future-grid">
                <div className="future-option">
                  <strong>Importar planilha</strong>
                  <span>Em breve</span>
                </div>

                <div className="future-option">
                  <strong>Leitor de código</strong>
                  <span>Em breve</span>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="button-secondary"
                onClick={closeModal}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cadastro e edição de produto */}
      {(modal === "product" || showProductForm) && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="modal form-modal">
            <div className="modal-header">
              <div>
                <h2>
                  {editingProduct ? "Editar produto" : "Cadastrar produto"}
                </h2>
                <p>Informações do produto.</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleProductSubmit}>
              <div className="form-grid">
                <label>
                  Nome
                  <input
                    type="text"
                    name="name"
                    value={productForm.name}
                    onChange={handleProductChange}
                    required
                  />
                </label>

                <label>
                  Categoria
                  <select
                    name="category_id"
                    value={productForm.category_id}
                    onChange={handleProductChange}
                    required
                  >
                    <option value="">Selecione</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Marca
                  <input
                    type="text"
                    name="brand"
                    value={productForm.brand}
                    onChange={handleProductChange}
                  />
                </label>

                <label>
                  Código de barras
                  <input
                    type="text"
                    name="barcode"
                    maxLength={14}
                    value={productForm.barcode}
                    onChange={handleProductChange}
                  />
                </label>

                <label>
                  Unidade de medida
                  <select
                    name="unit"
                    value={productForm.unit}
                    onChange={handleProductChange}
                    disabled={Boolean(editingProductHasLots)}
                    required
                  >
                    <option value="UN">Unidade (UN)</option>
                    <option value="KG">Quilograma (KG)</option>
                    <option value="L">Litro (L)</option>
                  </select>
                  {editingProductHasLots && (
                    <small>
                      Não é possível alterar a unidade porque já existem lotes.
                    </small>
                  )}
                </label>
              </div>

              {modalMessage && (
                <p className="modal-message">{modalMessage}</p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="button-text"
                  onClick={clearModalForm}
                >
                  Limpar
                </button>

                {modal === "register" && (
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={backToRegister}
                  >
                    Voltar
                  </button>
                )}

                <button
                  type="button"
                  className="button-secondary"
                  onClick={closeModal}
                >
                  Fechar
                </button>

                <button
                  type="submit"
                  className="button-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Salvando..."
                    : editingProduct
                    ? "Salvar alterações"
                    : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Registro de movimentação */}
      {modal === "movement" && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="modal form-modal">
            <div className="modal-header">
              <div>
                <h2>Registrar movimentação</h2>
                <p>Registre uma venda, doação ou descarte de um lote.</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleMovementSubmit}>
              <div className="form-grid">
                <label>
                  Tipo de movimentação
                  <select
                    name="movement_type"
                    value={movementForm.movement_type}
                    onChange={handleMovementChange}
                    required
                  >
                    <option value="VENDIDO">Vendido</option>
                    <option value="DOADO">Doado</option>
                    <option value="DESCARTADO">Descartado</option>
                  </select>
                </label>

                <label>
                  Lote
                  <select
                    name="lot_id"
                    value={movementForm.lot_id}
                    onChange={handleMovementChange}
                    required
                  >
                    <option value="">Selecione um lote</option>

                    {lotsWithInfo
                      .filter((lot) => lot.available > 0)
                      .map((lot) => (
                        <option key={lot.id} value={lot.id}>
                          {lot.product?.name || "Produto"} ·{" "}
                          {lot.lot_code || "Sem código"} ·{" "}
                          {formatQuantity(lot.available, lot.product?.unit)}
                          {lot.validity === "expired"
                            ? " · VENCIDO (somente descarte)"
                            : ""}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="quantity-unit-label">
                  Quantidade

                  <div className="quantity-unit-control">
                    <input
                      type="number"
                      name="quantity"
                      min={selectedMovementLot?.product?.unit === "UN" ? "1" : "0.001"}
                      max={selectedMovementLot?.available ?? undefined}
                      step={selectedMovementLot?.product?.unit === "UN" ? "1" : "0.001"}
                      value={movementForm.quantity}
                      onChange={handleMovementChange}
                      disabled={!selectedMovementLot}
                      required
                    />

                    <select
                      value={selectedMovementLot?.product?.unit || "UN"}
                      disabled
                      aria-label="Unidade de medida"
                    >
                      <option value="UN">Unidade</option>
                      <option value="KG">KG</option>
                      <option value="L">L</option>
                    </select>
                  </div>

                  {selectedMovementLot && (
                    <small className="form-hint">
                      Disponível:{" "}
                      {formatQuantity(
                        selectedMovementLot.available,
                        selectedMovementLot.product?.unit
                      )}
                    </small>
                  )}
                </label>

                <label>
                  Observação (opcional)
                  <textarea
                    name="notes"
                    rows="3"
                    value={movementForm.notes}
                    onChange={handleMovementChange}
                    placeholder="Adicione uma observação..."
                  />
                </label>
              </div>

              {selectedMovementLot?.validity === "expired" && (
                <p className="form-hint">
                  Este lote está vencido. Só é permitido registrar o descarte.
                </p>
              )}

              {modalMessage && (
                <p className="modal-message">{modalMessage}</p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={closeModal}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="button-primary"
                  disabled={saving || !selectedMovementLot}
                >
                  {saving ? "Registrando..." : "Registrar movimentação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cadastro e edição de lote */}
      {(modal === "lot" || showLotForm) && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="modal form-modal">
            <div className="modal-header">
              <div>
                <h2>{editingLot ? "Editar lote" : "Cadastrar lote"}</h2>
                <p>Selecione um produto e informe os dados do lote.</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleLotSubmit}>
              <div className="product-search">
                <label htmlFor="lot-product-search">Buscar produto</label>

                {!selectedProduct ? (
                  <>
                    <input
                      id="lot-product-search"
                      type="text"
                      placeholder="Nome, marca, código de barras ou categoria..."
                      value={lotSearch}
                      onChange={(event) => setLotSearch(event.target.value)}
                      autoComplete="off"
                    />

                    <div className="product-results">
                      {lotProductResults.length > 0 ? (
                        lotProductResults.map((product) => (
                          <button
                            type="button"
                            key={product.id}
                            className="product-result"
                            onClick={() => selectLotProduct(product)}
                          >
                            <span>
                              <strong>{product.name}</strong>
                              <small>
                                {getCategoryName(product.category_id)}
                                {product.brand ? ` · ${product.brand}` : ""}
                                {" · "}
                                {product.unit}
                              </small>
                            </span>
                            <span>Selecionar</span>
                          </button>
                        ))
                      ) : (
                        <p className="search-empty">
                          Nenhum produto encontrado.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="selected-product">
                    <div>
                      <strong>{selectedProduct.name}</strong>
                      <span>
                        {getCategoryName(selectedProduct.category_id)}
                        {selectedProduct.brand ? ` · ${selectedProduct.brand}` : ""}
                        {" · "}
                        {lotForm.unit}
                      </span>
                      {selectedProduct.barcode && (
                        <small>Código: {selectedProduct.barcode}</small>
                      )}
                    </div>

                    {!lotHasMovements && (
                      <button
                        type="button"
                        className="button-text"
                        onClick={clearLotProduct}
                      >
                        Trocar
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="form-grid">
                <label>
                  Código do lote
                  <input
                    type="text"
                    name="lot_code"
                    value={lotForm.lot_code}
                    onChange={handleLotChange}
                  />
                </label>

                <label className="quantity-unit-label">
                  Quantidade recebida

                  <div className="quantity-unit-control">
                    <input
                      type="number"
                      name="quantity_received"
                      min={selectedProduct?.unit === "UN" ? "1" : "0.001"}
                      step={selectedProduct?.unit === "UN" ? "1" : "0.001"}
                      value={lotForm.quantity_received}
                      onChange={handleLotChange}
                      required
                    />

                    <select
                      value={selectedProduct?.unit || "UN"}
                      disabled
                      aria-label="Unidade de medida"
                    >
                      <option value="UN">Unidade</option>
                      <option value="KG">KG</option>
                      <option value="L">L</option>
                    </select>
                  </div>

                  {selectedProduct && (
                    <small className="form-hint">
                      Unidade definida pelo cadastro do produto.
                    </small>
                  )}
                </label>

                <label>
                  Data de validade
                  <input
                    type="date"
                    name="expiration_date"
                    value={lotForm.expiration_date}
                    onChange={handleLotChange}
                    required
                  />
                </label>
              </div>

              {lotHasMovements && (
                <p className="form-hint">
                  Este lote já possui movimentações. O produto não pode ser trocado.
                </p>
              )}

              {modalMessage && (
                <p className="modal-message">{modalMessage}</p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="button-text"
                  onClick={clearModalForm}
                >
                  Limpar
                </button>

                {modal === "register" && (
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={backToRegister}
                  >
                    Voltar
                  </button>
                )}

                <button
                  type="button"
                  className="button-secondary"
                  onClick={closeModal}
                >
                  Fechar
                </button>

                <button
                  type="submit"
                  className="button-primary"
                  disabled={saving || !selectedProduct}
                >
                  {saving
                    ? "Salvando..."
                    : editingLot
                    ? "Salvar alterações"
                    : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default GerenciamentoProdutos;