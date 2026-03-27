let DB = null;
let currentTenant = null;
let currentView = "dashboard";

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  const res = await fetch("../../data/db.json");
  DB = await res.json();
  bindEvents();
}

/* =========================
   EVENTS
========================= */
function bindEvents() {
  document.body.addEventListener("click", handleClick);

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeSidebar();
  });
}

function handleClick(e) {

  if (e.target.id === "loginBtn") login();

  if (e.target.dataset.view) {
    navigate(e.target.dataset.view);
    closeSidebar();
  }

  if (e.target.classList.contains("wspBtn")) {
    generarMensajeWhatsApp(e.target.dataset.id);
  }

  if (e.target.classList.contains("statusBtn")) {
    cambiarEstado(e.target.dataset.id, e.target.dataset.status);
  }

  if (e.target.id === "menuToggle") openSidebar();
  if (e.target.id === "overlay") closeSidebar();
  if (e.target.id === "logoutBtn") logout();
}

/* =========================
   LOGIN
========================= */
function login() {
  const email = document.getElementById("email").value;

  const tenant = DB.tenants.find(t =>
    t.users.some(u => u.email === email)
  );

  if (!tenant) return alert("Usuario inválido");

  currentTenant = tenant;

  switchView("dashboard-view");
  renderLayout();
  render();
}

/* =========================
   LAYOUT
========================= */
function renderLayout() {
  document.getElementById("dashboard-view").innerHTML = `
    <aside class="sidebar" id="sidebar">
      <h2>${currentTenant.name}</h2>
      <button data-view="dashboard" class="nav-btn active">Dashboard</button>
      <button data-view="clientes" class="nav-btn">Clientes</button>
      <button data-view="pedidos" class="nav-btn">Pedidos</button>
    </aside>

    <div class="content">
      <header class="topbar">
        <button id="menuToggle">☰</button>
        <h3>${currentTenant.name}</h3>
        <button id="logoutBtn">Salir</button>
      </header>

      <main id="main-content"></main>
    </div>
  `;
}

/* =========================
   NAV
========================= */
function navigate(view) {
  currentView = view;

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  render();
}

/* =========================
   RENDER CENTRAL
========================= */
function render() {
  if (currentView === "dashboard") renderDashboard();
  if (currentView === "clientes") renderClientes();
  if (currentView === "pedidos") renderPedidos();
}

/* =========================
   DASHBOARD + GRÁFICA
========================= */
function renderDashboard() {
  const clientes = currentTenant.clients.length;
  const pedidos = currentTenant.orders.length;
  const listos = currentTenant.orders.filter(o => o.status === "listo").length;

  const container = document.getElementById("main-content");

  container.innerHTML = `
    <h2>Dashboard</h2>

    <div class="grid">
      <div class="card">Clientes: ${clientes}</div>
      <div class="card">Pedidos: ${pedidos}</div>
      <div class="card">Listos: ${listos}</div>
    </div>

    <canvas id="chart" height="100"></canvas>
  `;

  renderChart();
}

/* =========================
   GRÁFICA SIMPLE
========================= */
function renderChart() {
  const canvas = document.getElementById("chart");
  const ctx = canvas.getContext("2d");

  const data = [
    currentTenant.orders.filter(o => o.status === "sucio").length,
    currentTenant.orders.filter(o => o.status === "lavando").length,
    currentTenant.orders.filter(o => o.status === "listo").length
  ];

  const max = Math.max(...data) || 1;
  const width = 80;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  data.forEach((val, i) => {
    const height = (val / max) * 100;
    ctx.fillRect(i * 100 + 50, 120 - height, width, height);
  });
}

/* =========================
   CLIENTES
========================= */
function renderClientes() {
  const container = document.getElementById("main-content");

  container.innerHTML = `
    <h2>Clientes</h2>
    <div class="grid">
      ${currentTenant.clients.map(c => `
        <div class="card">
          <h3>${c.name}</h3>
          <p>${c.phone}</p>

          <span class="badge ${c.status}">${c.status}</span>

          <div>
            <button class="statusBtn" data-id="${c.id}" data-status="sucio">Sucio</button>
            <button class="statusBtn" data-id="${c.id}" data-status="lavando">Lavando</button>
            <button class="statusBtn" data-id="${c.id}" data-status="listo">Listo</button>
          </div>

          <button class="wspBtn" data-id="${c.id}">WhatsApp</button>
        </div>
      `).join("")}
    </div>
  `;
}

/* =========================
   PEDIDOS
========================= */
function renderPedidos() {
  const container = document.getElementById("main-content");

  container.innerHTML = `
    <h2>Pedidos</h2>
    <div class="grid">
      ${currentTenant.orders.map(o => {
        const c = currentTenant.clients.find(x => x.id == o.clientId);

        return `
          <div class="card">
            <h3>${c?.name}</h3>
            <p>${o.service}</p>

            <span class="badge ${o.status}">${o.status}</span>

            <div>
              <button class="statusBtn" data-id="${o.clientId}" data-status="sucio">Sucio</button>
              <button class="statusBtn" data-id="${o.clientId}" data-status="lavando">Lavando</button>
              <button class="statusBtn" data-id="${o.clientId}" data-status="listo">Listo</button>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

/* =========================
   CAMBIAR ESTADO
========================= */
function cambiarEstado(id, status) {
  const client = currentTenant.clients.find(c => c.id == id);
  const order = currentTenant.orders.find(o => o.clientId == id);

  if (client) client.status = status;
  if (order) order.status = status;

  render();
}

/* =========================
   WHATSAPP
========================= */
function generarMensajeWhatsApp(id) {
  const order = currentTenant.orders.find(o => o.clientId == id);

  let msg = {
    sucio: "🧺 Pendiente de lavado",
    lavando: "🌊 En proceso",
    listo: "✅ Listo para retirar"
  }[order.status];

  showModal(msg);
}

/* =========================
   MODAL
========================= */
function showModal(text) {
  document.getElementById("modal-text").innerText = text;
  document.getElementById("modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}

/* =========================
   SIDEBAR
========================= */
function openSidebar() {
  document.getElementById("sidebar")?.classList.add("open");
  document.getElementById("overlay")?.classList.remove("hidden");
}

function closeSidebar() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("overlay")?.classList.add("hidden");
}

/* =========================
   LOGOUT
========================= */
function logout() {
  location.reload();
}

/* =========================
   VIEW SWITCH
========================= */
function switchView(viewId) {
  document.querySelectorAll(".view").forEach(v =>
    v.classList.remove("active")
  );

  document.getElementById(viewId).classList.add("active");
}
