/* ===========================================================================
 * Evangeline Holdings — Live P&L Portfolio Dashboard
 * ---------------------------------------------------------------------------
 * A main "portfolio" page shows one live widget per company; clicking a widget
 * drills into that company's full Profit & Loss dashboard.
 *
 * Everything is a self-contained demo: each company deterministically
 * generates a realistic business day (seeded by company + date), and the
 * dashboard reveals each sale in real time as the day unfolds — so every
 * company's P&L, KPIs, charts and feed all move live throughout the day.
 *
 * No backend required. To wire real data later (e.g. QuickBooks), replace
 * buildDay() with a feed for each company; the rest keeps working unchanged.
 * ========================================================================= */

/* ============================ EDIT ME ===================================== *
 * Owner / portfolio name and the six companies. Rename freely — only `name`,
 * `type` and `color` are cosmetic; the other knobs shape each company's size
 * and margins so the portfolio looks varied and realistic.
 * ------------------------------------------------------------------------- */

const OWNER = "Evangeline Holdings";

// Revenue lines for the non-retail companies (the three Home Centers use the
// retail DEPARTMENTS defined further below). Each line: weight = share of
// transactions, margin = gross margin, avg = typical ticket, color = chart slice.
const INSURANCE_LINES = [
  { id: "auto",       name: "Auto Policies",   weight: 30, margin: 0.82, avg: 110, color: "#4f6bed" },
  { id: "home",       name: "Homeowners",      weight: 22, margin: 0.80, avg: 160, color: "#3fae6b" },
  { id: "life",       name: "Life",            weight: 14, margin: 0.85, avg: 240, color: "#e0567a" },
  { id: "commercial", name: "Commercial",      weight: 16, margin: 0.78, avg: 520, color: "#f0a93b" },
  { id: "health",     name: "Health",          weight: 18, margin: 0.80, avg: 130, color: "#8a63d2" },
];
const RENTAL_LINES = [
  { id: "equip",   name: "Equipment Rental",  weight: 34, margin: 0.62, avg: 95,  color: "#b07d4e" },
  { id: "tools",   name: "Tool Rental",       weight: 26, margin: 0.66, avg: 45,  color: "#4f6bed" },
  { id: "vehicle", name: "Vehicle & Trailer", weight: 14, margin: 0.55, avg: 130, color: "#1fa6c4" },
  { id: "party",   name: "Party & Event",     weight: 16, margin: 0.60, avg: 180, color: "#e0567a" },
  { id: "storage", name: "Storage",           weight: 10, margin: 0.75, avg: 120, color: "#3fae6b" },
];
const FINANCE_LINES = [
  { id: "personal", name: "Personal Loans",  weight: 30, margin: 0.72, avg: 180, color: "#8a63d2" },
  { id: "auto",     name: "Auto Loans",      weight: 24, margin: 0.70, avg: 260, color: "#4f6bed" },
  { id: "title",    name: "Title Loans",     weight: 18, margin: 0.78, avg: 150, color: "#f0a93b" },
  { id: "fees",     name: "Fees & Charges",  weight: 16, margin: 0.85, avg: 90,  color: "#3fae6b" },
  { id: "interest", name: "Interest Income", weight: 12, margin: 0.80, avg: 220, color: "#e0567a" },
];
const OPPZONE_LINES = [
  { id: "rental",  name: "Rental Income",       weight: 46, margin: 0.55, avg: 900,  color: "#3fae6b" },
  { id: "sales",   name: "Property Sales",      weight: 6,  margin: 0.30, avg: 5000, color: "#c25a4a" },
  { id: "dev",     name: "Development Fees",    weight: 16, margin: 0.50, avg: 1500, color: "#b07d4e" },
  { id: "mgmt",    name: "Management Fees",     weight: 22, margin: 0.70, avg: 650,  color: "#4f6bed" },
  { id: "credits", name: "Tax Credit Proceeds", weight: 10, margin: 0.85, avg: 1800, color: "#f0a93b" },
];

const COMPANIES = [
  // Three Home Center locations (retail — they use the DEPARTMENTS list below).
  { id: "hc_carencro",  name: "Evangeline Home Center / Carencro",   type: "Home Improvement · Carencro",
    mark: "C",  color: "#1f7a4d", txnScale: 1.00, ticketScale: 1.00, marginShift: 0, opex: 9450 },
  { id: "hc_opelousas", name: "Evangeline Home Center / Opelousas",  type: "Home Improvement · Opelousas",
    mark: "O",  color: "#2e8b57", txnScale: 0.82, ticketScale: 0.95, marginShift: 0, opex: 8200 },
  { id: "hc_panama",    name: "Evangeline Home Center / Panama City", type: "Home Improvement · Panama City",
    mark: "PC", color: "#0e7c86", txnScale: 1.12, ticketScale: 1.05, marginShift: 0, opex: 10400 },

  // Non-retail companies (each with its own revenue lines + cost label).
  { id: "insurance", name: "Evangeline Insurance", type: "Insurance Agency",
    mark: "IN", color: "#4f6bed", depts: INSURANCE_LINES, txnScale: 0.16, ticketScale: 1, marginShift: 0,
    opex: 5200, cogsLabel: "Producer & Carrier Costs" },
  { id: "rentals", name: "Evangeline Rentals", type: "Equipment Rental",
    mark: "RE", color: "#b07d4e", depts: RENTAL_LINES, txnScale: 0.22, ticketScale: 1, marginShift: 0,
    opex: 4200, cogsLabel: "Equipment & Maintenance" },
  { id: "finance", name: "A&A Finance", type: "Consumer Finance",
    mark: "AF", color: "#8a63d2", depts: FINANCE_LINES, txnScale: 0.13, ticketScale: 1, marginShift: 0,
    opex: 5200, cogsLabel: "Cost of Funds & Provisions" },
  { id: "oppzone", name: "La Opp Zone", type: "Opportunity-Zone Real Estate",
    mark: "LZ", color: "#c25a4a", depts: OPPZONE_LINES, txnScale: 0.04, ticketScale: 1, marginShift: 0,
    opex: 6800, cogsLabel: "Property Operating Costs" },
];

/* ------------------------- Shared business model ------------------------- */

const STORE = { open: 7, close: 20, txnPerDay: 430, returnRate: 0.045 };

const DEPARTMENTS = [
  { id: "lumber",     name: "Lumber & Building", weight: 16, margin: 0.22, avg: 130, color: "#b07d4e" },
  { id: "hardware",   name: "Hardware & Tools",  weight: 18, margin: 0.38, avg: 38,  color: "#4f6bed" },
  { id: "paint",      name: "Paint & Sundries",  weight: 13, margin: 0.43, avg: 50,  color: "#e0567a" },
  { id: "plumbing",   name: "Plumbing",          weight: 11, margin: 0.33, avg: 46,  color: "#1fa6c4" },
  { id: "electrical", name: "Electrical",        weight: 10, margin: 0.34, avg: 44,  color: "#f0a93b" },
  { id: "garden",     name: "Garden & Outdoor",  weight: 14, margin: 0.40, avg: 58,  color: "#3fae6b" },
  { id: "appliances", name: "Appliances",        weight: 6,  margin: 0.25, avg: 480, color: "#8a63d2" },
  { id: "flooring",   name: "Flooring",          weight: 12, margin: 0.35, avg: 150, color: "#cf8a3a" },
];

const HOUR_WEIGHTS = {
  7: 2, 8: 4, 9: 7, 10: 9, 11: 10, 12: 9, 13: 8,
  14: 8, 15: 9, 16: 10, 17: 9, 18: 7, 19: 4,
};
const HOUR_TOTAL_WEIGHT = Object.values(HOUR_WEIGHTS).reduce((s, w) => s + w, 0);

// Operating-expense categories (a company's daily OpEx is split across these
// in the same proportions, then scaled to its own `opex` total).
const OPEX_BASE = [
  { id: "payroll",   name: "Payroll & Benefits",      amount: 5400 },
  { id: "occupancy", name: "Occupancy / Rent",        amount: 1750 },
  { id: "utilities", name: "Utilities",               amount: 520  },
  { id: "marketing", name: "Marketing & Advertising", amount: 480  },
  { id: "insurance", name: "Insurance",               amount: 360  },
  { id: "supplies",  name: "Store Supplies",          amount: 240  },
  { id: "deprec",    name: "Depreciation",            amount: 380  },
  { id: "admin",     name: "Other / Admin",           amount: 320  },
];
const OPEX_BASE_TOTAL = OPEX_BASE.reduce((s, x) => s + x.amount, 0);

function opexFor(company) {
  const f = company.opex / OPEX_BASE_TOTAL;
  return OPEX_BASE.map((o) => ({ name: o.name, amount: o.amount * f }));
}

/* ------------------------------- Utilities ------------------------------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function atHour(base, hour, min = 0, sec = 0) {
  const d = new Date(base); d.setHours(hour, min, sec, 0); return d.getTime();
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
function fmtClock(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
}
function money(n, cents = false) {
  const neg = n < 0, v = Math.abs(n);
  const s = v.toLocaleString(undefined, {
    minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0,
  });
  return (neg ? "−$" : "$") + s;
}
function pct(n) { return (n * 100).toFixed(1) + "%"; }

/* ----------------------------- Build a day ------------------------------- */

const HOURS = Object.keys(HOUR_WEIGHTS).map(Number);
const HOUR_SPAN = STORE.close - STORE.open + 1;

function pickWeighted(list, weightOf, r) {
  let x = r * list.reduce((s, it) => s + weightOf(it), 0);
  for (const it of list) { x -= weightOf(it); if (x <= 0) return it; }
  return list[list.length - 1];
}

function buildDay(company, base) {
  const rng = mulberry32(hashStr(company.id + "|" + dateKey(base)));
  const depts = company.depts || DEPARTMENTS;
  const count = Math.round(STORE.txnPerDay * company.txnScale * (0.94 + rng() * 0.12));
  const txns = [];
  for (let i = 0; i < count; i++) {
    const hour = pickWeighted(HOURS, (h) => HOUR_WEIGHTS[h], rng());
    const ts = atHour(base, hour, Math.floor(rng() * 60), Math.floor(rng() * 60));
    const dept = pickWeighted(depts, (d) => d.weight, rng());
    const isReturn = rng() < STORE.returnRate;

    const sizeFactor = 0.4 + rng() * 1.0 + Math.pow(rng(), 3) * 1.6;
    let amount = dept.avg * company.ticketScale * (isReturn ? 0.35 + rng() * 0.5 : sizeFactor);
    amount = Math.round(amount * 100) / 100;

    const margin = Math.min(0.85, Math.max(0.08, dept.margin + company.marginShift)) * (0.9 + rng() * 0.2);
    const cogs = Math.round(amount * (1 - margin) * 100) / 100;

    txns.push({
      ts, deptId: dept.id,
      amount: isReturn ? -amount : amount,
      cogs: isReturn ? -cogs : cogs,
      isReturn,
    });
  }
  txns.sort((a, b) => a.ts - b.ts);
  return txns;
}

/* ------------------------------- Portfolio ------------------------------- */

const today = new Date();
const openTs = atHour(today, STORE.open);
const closeTs = atHour(today, STORE.close);

function businessProgress(t) {
  return Math.max(0, Math.min(1, (t - openTs) / (closeTs - openTs)));
}
function clampNow(t) { return Math.max(openTs, Math.min(closeTs, t)); }

// Build each company's full day + projection + live-running state.
const PF = COMPANIES.map((cfg) => {
  const txns = buildDay(cfg, today);
  let gross = 0, returns = 0, cogs = 0;
  const byDept = {};
  for (const t of txns) {
    if (t.amount >= 0) gross += t.amount; else returns += -t.amount;
    cogs += t.cogs;
    byDept[t.deptId] = (byDept[t.deptId] || 0) + t.amount;
  }
  const net = gross - returns;
  return {
    cfg,
    txns,
    opex: opexFor(cfg),
    opexTotal: cfg.opex,
    projected: { gross, returns, net, cogs, grossProfit: net - cogs, byDept },
    projByHour: hourBuckets(txns),
    state: blankState(cfg),
  };
});
const byId = Object.fromEntries(PF.map((p) => [p.cfg.id, p]));

function blankState(company) {
  const depts = (company && company.depts) || DEPARTMENTS;
  return {
    revealed: 0, gross: 0, returns: 0, cogs: 0, txnCount: 0,
    byDept: Object.fromEntries(depts.map((d) => [d.id, 0])),
    hourly: new Array(HOUR_SPAN).fill(0),
    feed: [], feedDirty: true,
  };
}
function hourBuckets(txns) {
  const b = new Array(HOUR_SPAN).fill(0);
  for (const t of txns) {
    const idx = Math.min(HOUR_SPAN - 1, Math.max(0, new Date(t.ts).getHours() - STORE.open + 1));
    b[idx] += t.amount;
  }
  return b;
}

const sim = { now: clampNow(Date.now()), speed: 1, mode: "live", lastFrame: Date.now() };

function revealUpTo(p, t) {
  const s = p.state;
  while (s.revealed < p.txns.length && p.txns[s.revealed].ts <= t) {
    const tx = p.txns[s.revealed];
    if (tx.amount >= 0) s.gross += tx.amount; else s.returns += -tx.amount;
    s.cogs += tx.cogs;
    s.byDept[tx.deptId] += tx.amount;
    s.txnCount += 1;
    const idx = Math.min(HOUR_SPAN - 1, Math.max(0, new Date(tx.ts).getHours() - STORE.open + 1));
    s.hourly[idx] += tx.amount;
    s.feed.push(tx);
    if (s.feed.length > 40) s.feed.shift();
    s.feedDirty = true;
    s.revealed += 1;
  }
}

function snapshot(p) {
  const s = p.state;
  const net = s.gross - s.returns;
  const grossProfit = net - s.cogs;
  const opexAccrued = p.opexTotal * businessProgress(sim.now);
  const netProfit = grossProfit - opexAccrued;
  return {
    gross: s.gross, returns: s.returns, net, cogs: s.cogs, grossProfit,
    grossMargin: net > 0 ? grossProfit / net : 0,
    opexAccrued, netProfit, netMargin: net > 0 ? netProfit / net : 0,
    txnCount: s.txnCount,
  };
}

function cumulative(arr, uptoIdx) {
  const out = []; let c = 0;
  for (let i = 0; i < arr.length; i++) {
    c += arr[i];
    out.push(uptoIdx == null || i <= uptoIdx ? Math.round(c) : null);
  }
  return out;
}
function nowHourIdx() {
  return Math.round(businessProgress(sim.now) * (HOUR_SPAN - 1));
}

/* --------------------------------- Charts -------------------------------- */

const CSS = getComputedStyle(document.documentElement);
const ink = (v) => CSS.getPropertyValue(v).trim();
const hasChart = typeof Chart !== "undefined";
if (hasChart) {
  Chart.defaults.font.family = "ui-sans-serif, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  Chart.defaults.color = ink("--muted");
}

const HOUR_LABELS = (() => {
  const out = [];
  for (let h = STORE.open; h <= STORE.close; h++) {
    out.push((((h + 11) % 12) + 1) + (h < 12 ? "a" : "p"));
  }
  return out;
})();

function makeSparkline(canvas, color) {
  if (!hasChart) return null;
  return new Chart(canvas, {
    type: "line",
    data: { labels: HOUR_LABELS, datasets: [{
      data: [], borderColor: color, borderWidth: 2,
      backgroundColor: color + "22", fill: true, tension: 0.35, pointRadius: 0,
    }]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false, beginAtZero: true } },
      animation: false,
    },
  });
}

/* ----------------------------- Overview view ----------------------------- */

const el = (id) => document.getElementById(id);
const cardRefs = {};

function buildOverview() {
  el("owner-name").textContent = OWNER;
  el("owner-name-foot").textContent = OWNER;
  const grid = el("company-grid");
  grid.innerHTML = "";
  for (const p of PF) {
    const c = p.cfg;
    const card = document.createElement("a");
    card.className = "company-card";
    card.href = "#/c/" + c.id;
    card.style.setProperty("--c", c.color);
    card.innerHTML = `
      <div class="cc-top">
        <div class="cc-id">
          <span class="cc-name">${c.name}</span>
          <span class="cc-type">${c.type}</span>
        </div>
        <span class="cc-status" data-r="status">●</span>
      </div>
      <div class="cc-spark"><canvas></canvas></div>
      <div class="cc-stats">
        <div class="cc-stat">
          <span class="cc-stat-label">Net Sales</span>
          <span class="cc-stat-val" data-r="sales">$0</span>
        </div>
        <div class="cc-stat">
          <span class="cc-stat-label">Net Profit</span>
          <span class="cc-stat-val" data-r="net">$0</span>
          <span class="cc-stat-sub" data-r="margin">0.0%</span>
        </div>
      </div>
      <span class="cc-open">Open dashboard →</span>
    `;
    grid.appendChild(card);
    cardRefs[c.id] = {
      card,
      status: card.querySelector('[data-r="status"]'),
      sales: card.querySelector('[data-r="sales"]'),
      net: card.querySelector('[data-r="net"]'),
      margin: card.querySelector('[data-r="margin"]'),
      spark: makeSparkline(card.querySelector("canvas"), c.color),
    };
  }
}

function renderOverview() {
  let gNet = 0, gGross = 0, gOpex = 0, gNetProfit = 0, openCount = 0;
  const open = businessProgress(sim.now) < 1 && sim.now >= openTs;

  for (const p of PF) {
    const s = snapshot(p);
    gNet += s.net; gGross += s.grossProfit; gOpex += s.opexAccrued; gNetProfit += s.netProfit;
    if (open) openCount++;

    const r = cardRefs[p.cfg.id];
    r.sales.textContent = money(s.net);
    r.net.textContent = money(s.netProfit);
    r.net.classList.toggle("neg", s.netProfit < 0);
    r.margin.textContent = pct(s.netMargin) + " margin";
    r.status.className = "cc-status " + (open ? "open" : "closed");
    r.status.textContent = open ? "● Open" : "● Closed";
    if (r.spark) {
      r.spark.data.datasets[0].data = cumulative(p.state.hourly, nowHourIdx());
      r.spark.update("none");
    }
  }

  setText("g-sales", money(gNet));
  setText("g-gross", money(gGross));
  setText("g-gross-sub", (gNet > 0 ? pct(gGross / gNet) : "0.0%") + " gross margin");
  setText("g-opex", money(gOpex));
  setText("g-net", money(gNetProfit));
  el("g-net").classList.toggle("neg", gNetProfit < 0);
  setText("g-net-sub", (gNet > 0 ? pct(gNetProfit / gNet) : "0.0%") + " net margin");
  setText("g-open", openCount + " / " + PF.length + " open");
}

function setText(id, text) {
  const n = el(id);
  if (n && n.textContent !== text) { n.textContent = text; flash(n); }
}
function flash(node) { node.classList.remove("flash"); void node.offsetWidth; node.classList.add("flash"); }

/* ------------------------------ Detail view ------------------------------ */

let dRev, dDept, dWater, dChartsCo = null;
let waterMag = [0, 0, 0, 0, 0];

function initDetailCharts() {
  if (!hasChart || dRev) return;
  dRev = new Chart(el("revChart"), {
    type: "line",
    data: { labels: HOUR_LABELS, datasets: [
      { label: "Realized", data: [], borderColor: ink("--accent"), backgroundColor: "rgba(31,122,77,0.12)",
        borderWidth: 2.5, fill: true, tension: 0.35, pointRadius: 0 },
      { label: "Projected", data: [], borderColor: ink("--muted"), borderDash: [5, 5],
        borderWidth: 1.5, fill: false, tension: 0.35, pointRadius: 0 },
    ]},
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: "index" },
      plugins: { legend: { display: true, labels: { boxWidth: 12, usePointStyle: true } },
        tooltip: { callbacks: { label: (c) => "  " + money(c.parsed.y) } } },
      scales: { y: { ticks: { callback: (v) => "$" + (v / 1000).toFixed(0) + "k" }, grid: { color: ink("--grid") } },
        x: { grid: { display: false } } },
    },
  });
  dDept = new Chart(el("deptChart"), {
    type: "doughnut",
    data: { labels: DEPARTMENTS.map((d) => d.name), datasets: [{
      data: DEPARTMENTS.map(() => 0), backgroundColor: DEPARTMENTS.map((d) => d.color),
      borderColor: ink("--panel"), borderWidth: 2,
    }]},
    options: { responsive: true, maintainAspectRatio: false, cutout: "62%",
      plugins: { legend: { position: "right", labels: { boxWidth: 10, usePointStyle: true, padding: 8, font: { size: 11 } } },
        tooltip: { callbacks: { label: (c) => "  " + c.label + ": " + money(c.parsed) } } } },
  });
  dWater = new Chart(el("waterfallChart"), {
    type: "bar",
    data: { labels: ["Net Sales", "− COGS", "Gross Profit", "− OpEx", "Net Profit"], datasets: [
      { label: "base", data: [], backgroundColor: "rgba(0,0,0,0)", stack: "s" },
      { label: "value", data: [], backgroundColor: [ink("--accent"), ink("--rust"), ink("--accent"), ink("--rust"), ink("--gold")],
        borderRadius: 4, stack: "s" },
    ]},
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: (c) => (c.datasetIndex === 1 ? "  " + money(waterMag[c.dataIndex]) : null) } } },
      scales: { y: { ticks: { callback: (v) => "$" + (v / 1000).toFixed(0) + "k" }, grid: { color: ink("--grid") } },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } } } },
  });
}

function renderDetail(p) {
  const c = p.cfg, s = snapshot(p);
  el("d-name").textContent = c.name;
  el("d-type").textContent = c.type;
  el("d-mark").textContent = c.mark || c.name.replace(/[^A-Za-z ]/g, "").slice(0, 2).toUpperCase();
  el("d-mark").style.background = c.color;
  document.documentElement.style.setProperty("--accent", c.color);

  const dstatus = el("d-status");
  if (businessProgress(sim.now) >= 1) { dstatus.textContent = "● Day Complete"; dstatus.className = "store-status closed"; }
  else if (sim.now >= openTs && sim.now < closeTs) { dstatus.textContent = "● Open"; dstatus.className = "store-status open"; }
  else { dstatus.textContent = "● Closed"; dstatus.className = "store-status closed"; }

  // KPIs
  setText("kpi-sales", money(s.net));
  el("kpi-sales-sub").textContent = s.txnCount.toLocaleString() + " transactions · " +
    money(s.txnCount ? s.net / s.txnCount : 0) + " avg ticket";
  setText("kpi-gross", money(s.grossProfit));
  el("kpi-gross-sub").textContent = pct(s.grossMargin) + " gross margin";
  setText("kpi-opex", money(s.opexAccrued));
  el("kpi-opex-sub").textContent = pct(businessProgress(sim.now)) + " of day · " + money(p.opexTotal) + " budget";
  setText("kpi-net", money(s.netProfit));
  el("kpi-net").classList.toggle("neg", s.netProfit < 0);
  el("kpi-net-sub").textContent = pct(s.netMargin) + " net margin";
  el("kpi-net-sub").classList.toggle("neg", s.netProfit < 0);

  renderPnl(p, s);
  renderDeptNote(s);
  renderFeed(p);
  if (hasChart) updateDetailCharts(p, s);
}

function pnlRow({ label, today, eod, ns, kind = "" }) {
  const pctCell = ns && today !== null ? pct(today / ns) : "—";
  const showPct = kind.includes("total") || kind.includes("strong");
  return `<tr class="pnl-row ${kind}">
    <td class="ln">${label}</td>
    <td class="num${today < 0 ? " neg" : ""}">${today === null ? "" : money(today)}</td>
    <td class="num pct-col">${showPct ? pctCell : ""}</td>
    <td class="num${eod < 0 ? " neg" : ""}">${eod === null ? "" : money(eod)}</td>
  </tr>`;
}

function renderPnl(p, s) {
  const ns = s.net, prog = businessProgress(sim.now), proj = p.projected;
  let html = "";
  html += pnlRow({ label: "Gross Sales", today: s.gross, eod: proj.gross, ns });
  html += pnlRow({ label: "Less: Returns & Allowances", today: -s.returns, eod: -proj.returns, ns });
  html += pnlRow({ label: "Net Sales", today: ns, eod: proj.net, ns, kind: "strong" });
  html += pnlRow({ label: p.cfg.cogsLabel || "Cost of Goods Sold", today: -s.cogs, eod: -proj.cogs, ns });
  html += pnlRow({ label: "Gross Profit", today: s.grossProfit, eod: proj.grossProfit, ns, kind: "strong total" });
  html += `<tr class="pnl-section"><td colspan="4">Operating Expenses</td></tr>`;
  for (const o of p.opex) html += pnlRow({ label: o.name, today: -o.amount * prog, eod: -o.amount, ns });
  html += pnlRow({ label: "Total Operating Expenses", today: -s.opexAccrued, eod: -p.opexTotal, ns, kind: "total" });
  html += pnlRow({ label: "Net Operating Income", today: s.netProfit, eod: proj.grossProfit - p.opexTotal, ns, kind: "strong total net" });
  el("pnl-body").innerHTML = html;
}

function renderDeptNote(s) { el("dept-total-note").textContent = money(s.net) + " net sales"; }

const FEED_MAX = 14;
function renderFeed(p) {
  if (!p.state.feedDirty) return;
  p.state.feedDirty = false;
  const feed = el("feed");
  const depts = p.cfg.depts || DEPARTMENTS;
  const items = p.state.feed.slice(-FEED_MAX).reverse();
  feed.innerHTML = items.map((tx) => {
    const dept = depts.find((d) => d.id === tx.deptId) || { name: tx.deptId, color: "#9aa7b6" };
    return `<li class="feed-item${tx.isReturn ? " is-return" : ""}">
      <span class="fi-time">${fmtTime(tx.ts)}</span>
      <span class="fi-dot" style="background:${dept.color}"></span>
      <span class="fi-dept">${dept.name}</span>
      <span class="fi-amt">${tx.isReturn ? "−" : ""}${money(Math.abs(tx.amount), true)}</span>
    </li>`;
  }).join("");
}

function updateDetailCharts(p, s) {
  initDetailCharts();
  const real = cumulative(p.state.hourly, nowHourIdx());
  const proj = cumulative(p.projByHour, null);
  dRev.data.datasets[0].data = real;
  dRev.data.datasets[1].data = proj;
  dRev.update("none");

  const depts = p.cfg.depts || DEPARTMENTS;
  dDept.data.labels = depts.map((d) => d.name);
  dDept.data.datasets[0].data = depts.map((d) => Math.max(0, p.state.byDept[d.id] || 0));
  dDept.data.datasets[0].backgroundColor = depts.map((d) => d.color);
  dDept.update("none");

  const np = s.netProfit;
  waterMag = [s.net, s.cogs, s.grossProfit, s.opexAccrued, np];
  dWater.data.datasets[0].data = [0, s.grossProfit, 0, Math.max(np, 0), Math.min(np, 0)];
  dWater.data.datasets[1].data = [s.net, s.cogs, s.grossProfit, s.opexAccrued, Math.abs(np)];
  dWater.update("none");
  dChartsCo = p.cfg.id;
}

/* -------------------------------- Router --------------------------------- */

let view = "overview";    // "overview" | "detail"
let activeId = null;

function route() {
  const m = location.hash.match(/^#\/c\/([\w-]+)/);
  if (m && byId[m[1]]) { view = "detail"; activeId = m[1]; }
  else { view = "overview"; activeId = null; }
  el("view-overview").hidden = view !== "overview";
  el("view-detail").hidden = view !== "detail";
  if (view === "overview") { document.documentElement.style.setProperty("--accent", "#1f7a4d"); renderOverview(); }
  else { initDetailCharts(); renderDetail(byId[activeId]); byId[activeId].state.feedDirty = true; }
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

/* ------------------------------ Status bar ------------------------------- */

function renderStatusBar() {
  const realClosed = Date.now() >= closeTs;
  el("as-of").textContent = "as of " + fmtClock(sim.now);
  const prog = businessProgress(sim.now);
  el("day-fill").style.width = (prog * 100).toFixed(1) + "%";
  el("day-pct").textContent = Math.round(prog * 100) + "%";

  const pill = el("live-pill");
  if (sim.mode === "replay") { el("live-label").textContent = "REPLAY " + sim.speed + "×"; pill.classList.add("replay"); }
  else { el("live-label").textContent = realClosed ? "FINAL" : "LIVE"; pill.classList.remove("replay"); }
}

/* ------------------------------- Main loop ------------------------------- */

let renderAccumulator = 0;

function tick() {
  const real = Date.now();
  const dt = real - sim.lastFrame;
  sim.lastFrame = real;

  if (sim.mode === "live") sim.now = clampNow(real);
  else { sim.now = Math.min(closeTs, sim.now + dt * sim.speed); if (sim.now >= closeTs) sim.speed = 0; }

  let newReveal = false;
  for (const p of PF) {
    const before = p.state.revealed;
    revealUpTo(p, sim.now);
    if (p.state.revealed !== before) newReveal = true;
  }

  renderAccumulator += dt;
  if (renderAccumulator >= 200 || newReveal) {
    renderAccumulator = 0;
    renderStatusBar();
    if (view === "overview") renderOverview();
    else renderDetail(byId[activeId]);
  }
  requestAnimationFrame(tick);
}

/* ------------------------------- Controls -------------------------------- */

function resetAll() {
  for (const p of PF) { p.state = blankState(p.cfg); }
}
function setMode(mode) {
  el("btn-live").classList.toggle("is-active", mode === "live");
  el("btn-replay").classList.toggle("is-active", mode === "replay");
  sim.mode = mode;
}
function goLive() {
  setMode("live"); sim.speed = 1; resetAll(); sim.now = clampNow(Date.now());
  for (const p of PF) revealUpTo(p, sim.now);
}
function replayDay() {
  setMode("replay"); resetAll(); sim.now = openTs;
  sim.speed = Math.round((closeTs - openTs) / 90000);
}

/* --------------------------------- Boot ---------------------------------- */

function boot() {
  buildOverview();
  el("btn-live").addEventListener("click", goLive);
  el("btn-replay").addEventListener("click", replayDay);

  for (const p of PF) revealUpTo(p, sim.now);
  route();
  renderStatusBar();

  sim.lastFrame = Date.now();
  requestAnimationFrame(tick);
}

// Small debug hook (handy for verification).
window.__PF = { PF, byId, sim, snapshot, businessProgress };

boot();
