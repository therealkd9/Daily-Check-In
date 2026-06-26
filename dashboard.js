/* ===========================================================================
 * Evangeline Home Center — Live P&L Dashboard
 * ---------------------------------------------------------------------------
 * A self-contained demo. It deterministically generates a realistic business
 * day of sales (seeded by the calendar date), then "reveals" each transaction
 * in real time as the day unfolds — so the Profit & Loss statement, KPIs,
 * charts and sales feed all move live, just like a real store's day.
 *
 * No backend required. To wire real point-of-sale data later, replace
 * buildDay() with a feed from your POS / accounting system.
 * ========================================================================= */

/* ----------------------------- Business model ---------------------------- */

const STORE = {
  open: 7,            // 7:00 AM
  close: 20,          // 8:00 PM
  txnPerDay: 430,     // base transaction count for a full day
  returnRate: 0.045,  // share of transactions that are customer returns
};

// Departments: weight = share of transactions, margin = gross margin,
// avg = average ticket size, color used in charts.
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

// Relative customer traffic by hour-of-day (index = hour, 7AM … 7PM).
const HOUR_WEIGHTS = {
  7: 2, 8: 4, 9: 7, 10: 9, 11: 10, 12: 9, 13: 8,
  14: 8, 15: 9, 16: 10, 17: 9, 18: 7, 19: 4,
};

// Fixed daily operating expenses (accrue steadily through open hours).
const OPEX = [
  { id: "payroll",   name: "Payroll & Benefits",     amount: 5400 },
  { id: "occupancy", name: "Occupancy / Rent",       amount: 1750 },
  { id: "utilities", name: "Utilities",              amount: 520  },
  { id: "marketing", name: "Marketing & Advertising", amount: 480 },
  { id: "insurance", name: "Insurance",              amount: 360  },
  { id: "supplies",  name: "Store Supplies",         amount: 240  },
  { id: "deprec",    name: "Depreciation",           amount: 380  },
  { id: "admin",     name: "Other / Admin",          amount: 320  },
];
const OPEX_TOTAL = OPEX.reduce((s, x) => s + x.amount, 0);

/* ------------------------------- PRNG utils ------------------------------ */

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
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ----------------------------- Date helpers ------------------------------ */

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function atHour(base, hour, min = 0, sec = 0) {
  const d = new Date(base);
  d.setHours(hour, min, sec, 0);
  return d.getTime();
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
function fmtClock(ts) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* --------------------------- Money formatting ---------------------------- */

function money(n, cents = false) {
  const neg = n < 0;
  const v = Math.abs(n);
  const s = v.toLocaleString(undefined, {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
  return (neg ? "−$" : "$") + s;
}
function pct(n) {
  return (n * 100).toFixed(1) + "%";
}

/* ------------------------- Build a full sales day ------------------------ */
// Deterministic for a given calendar date: the same day always produces the
// same sequence of transactions, so refreshing doesn't reshuffle history.

const DEPT_TOTAL_WEIGHT = DEPARTMENTS.reduce((s, d) => s + d.weight, 0);
const HOUR_TOTAL_WEIGHT = Object.values(HOUR_WEIGHTS).reduce((s, w) => s + w, 0);

function pickWeighted(list, weightOf, r) {
  let x = r * list.reduce((s, it) => s + weightOf(it), 0);
  for (const it of list) {
    x -= weightOf(it);
    if (x <= 0) return it;
  }
  return list[list.length - 1];
}

function buildDay(base) {
  const seed = hashStr("evangeline-" + dateKey(base));
  const rng = mulberry32(seed);

  const count = Math.round(STORE.txnPerDay * (0.94 + rng() * 0.12));
  const hours = Object.keys(HOUR_WEIGHTS).map(Number);
  const txns = [];

  for (let i = 0; i < count; i++) {
    // When did it happen? Weighted by hourly traffic.
    const hour = pickWeighted(hours, (h) => HOUR_WEIGHTS[h], rng());
    const ts = atHour(base, hour, Math.floor(rng() * 60), Math.floor(rng() * 60));

    const dept = pickWeighted(DEPARTMENTS, (d) => d.weight, rng());
    const isReturn = rng() < STORE.returnRate;

    // Ticket size: skewed around the department average.
    const sizeFactor = 0.4 + rng() * 1.0 + Math.pow(rng(), 3) * 1.6;
    let amount = dept.avg * (isReturn ? 0.35 + rng() * 0.5 : sizeFactor);
    amount = Math.round(amount * 100) / 100;

    // COGS with a little per-ticket margin noise.
    const realizedMargin = dept.margin * (0.9 + rng() * 0.2);
    const cogs = Math.round(amount * (1 - realizedMargin) * 100) / 100;

    txns.push({
      ts,
      deptId: dept.id,
      amount: isReturn ? -amount : amount,
      cogs: isReturn ? -cogs : cogs,
      isReturn,
    });
  }

  txns.sort((a, b) => a.ts - b.ts);
  return txns;
}

/* --------------------------------- State --------------------------------- */

const now = new Date();           // real "today"
const openTs = atHour(now, STORE.open);
const closeTs = atHour(now, STORE.close);
const dayTxns = buildDay(now);

// Full-day projection totals (everything that will happen today).
const projected = (() => {
  let gross = 0, returns = 0, cogs = 0;
  const byDept = {};
  for (const t of dayTxns) {
    if (t.amount >= 0) gross += t.amount; else returns += -t.amount;
    cogs += t.cogs;
    byDept[t.deptId] = (byDept[t.deptId] || 0) + t.amount;
  }
  const net = gross - returns;
  return { gross, returns, net, cogs, grossProfit: net - cogs, byDept };
})();

const state = {
  simNow: clampNow(Date.now()),
  speed: 1,            // 1 = live; >1 = replay acceleration
  mode: "live",        // "live" | "replay"
  revealed: 0,         // index into dayTxns
  gross: 0,
  returns: 0,
  cogs: 0,
  byDept: Object.fromEntries(DEPARTMENTS.map((d) => [d.id, 0])),
  hourly: new Array(STORE.close - STORE.open + 1).fill(0), // cumulative net by hour boundary
  lastFrame: Date.now(),
  txnCount: 0,
};

function clampNow(t) {
  return Math.max(openTs, Math.min(closeTs, t));
}

function businessProgress(t) {
  return Math.max(0, Math.min(1, (t - openTs) / (closeTs - openTs)));
}

/* ----------------------- Derived live P&L snapshot ----------------------- */

function snapshot() {
  const net = state.gross - state.returns;
  const grossProfit = net - state.cogs;
  const opexAccrued = OPEX_TOTAL * businessProgress(state.simNow);
  const netProfit = grossProfit - opexAccrued;
  return {
    gross: state.gross,
    returns: state.returns,
    net,
    cogs: state.cogs,
    grossProfit,
    grossMargin: net > 0 ? grossProfit / net : 0,
    opexAccrued,
    netProfit,
    netMargin: net > 0 ? netProfit / net : 0,
  };
}

/* ------------------------------- Reveal loop ----------------------------- */

const pendingFeed = [];

function revealUpTo(t) {
  while (state.revealed < dayTxns.length && dayTxns[state.revealed].ts <= t) {
    const tx = dayTxns[state.revealed];
    if (tx.amount >= 0) state.gross += tx.amount;
    else state.returns += -tx.amount;
    state.cogs += tx.cogs;
    state.byDept[tx.deptId] += tx.amount;
    state.txnCount += 1;
    pendingFeed.push(tx);
    state.revealed += 1;
  }
}

/* --------------------------------- Charts -------------------------------- */

let revChart, deptChart, waterfallChart;
let chartsReady = false;
const CSS = getComputedStyle(document.documentElement);
const ink = (v) => CSS.getPropertyValue(v).trim();

function initCharts() {
  if (typeof Chart === "undefined") {
    // Chart library unavailable — the P&L, KPIs and feed still work.
    console.warn("Chart.js not loaded; charts disabled.");
    return;
  }
  Chart.defaults.font.family =
    "ui-sans-serif, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  Chart.defaults.color = ink("--muted");

  const hourLabels = [];
  for (let h = STORE.open; h <= STORE.close; h++) {
    const ampm = h < 12 ? "a" : "p";
    const hr = ((h + 11) % 12) + 1;
    hourLabels.push(hr + ampm);
  }

  // Revenue — realized (solid) vs projected (dashed).
  revChart = new Chart(document.getElementById("revChart"), {
    type: "line",
    data: {
      labels: hourLabels,
      datasets: [
        {
          label: "Realized",
          data: [],
          borderColor: ink("--accent"),
          backgroundColor: "rgba(31,122,77,0.12)",
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
        },
        {
          label: "Projected",
          data: [],
          borderColor: ink("--muted"),
          borderDash: [5, 5],
          borderWidth: 1.5,
          fill: false,
          tension: 0.35,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { display: true, labels: { boxWidth: 12, usePointStyle: true } },
        tooltip: { callbacks: { label: (c) => "  " + money(c.parsed.y) } },
      },
      scales: {
        y: {
          ticks: { callback: (v) => "$" + (v / 1000).toFixed(0) + "k" },
          grid: { color: ink("--grid") },
        },
        x: { grid: { display: false } },
      },
    },
  });

  // Department donut.
  deptChart = new Chart(document.getElementById("deptChart"), {
    type: "doughnut",
    data: {
      labels: DEPARTMENTS.map((d) => d.name),
      datasets: [
        {
          data: DEPARTMENTS.map(() => 0),
          backgroundColor: DEPARTMENTS.map((d) => d.color),
          borderColor: ink("--panel"),
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: { position: "right", labels: { boxWidth: 10, usePointStyle: true, padding: 8, font: { size: 11 } } },
        tooltip: { callbacks: { label: (c) => "  " + c.label + ": " + money(c.parsed) } },
      },
    },
  });

  // Profit waterfall (floating stacked bars).
  waterfallChart = new Chart(document.getElementById("waterfallChart"), {
    type: "bar",
    data: {
      labels: ["Net Sales", "− COGS", "Gross Profit", "− OpEx", "Net Profit"],
      datasets: [
        { label: "base", data: [], backgroundColor: "rgba(0,0,0,0)", stack: "s" },
        {
          label: "value",
          data: [],
          backgroundColor: [
            ink("--accent"), ink("--rust"), ink("--accent"), ink("--rust"), ink("--gold"),
          ],
          borderRadius: 4,
          stack: "s",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => (c.datasetIndex === 1 ? "  " + money(waterfallMag[c.dataIndex]) : null),
          },
        },
      },
      scales: {
        y: { ticks: { callback: (v) => "$" + (v / 1000).toFixed(0) + "k" }, grid: { color: ink("--grid") } },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
    },
  });

  chartsReady = true;
}

let waterfallMag = [0, 0, 0, 0, 0];

function updateCharts(s) {
  if (!chartsReady) return;
  // Revenue line: cumulative net sales by hour boundary.
  const realized = [];
  const projectedLine = [];
  let cumReal = 0;
  let cumProj = 0;
  // Pre-compute projected cumulative per hour from the full day.
  const projByHour = new Array(STORE.close - STORE.open + 1).fill(0);
  for (const t of dayTxns) {
    const hr = new Date(t.ts).getHours();
    const idx = Math.min(projByHour.length - 1, Math.max(0, hr - STORE.open + 1));
    projByHour[idx] += t.amount;
  }
  const realByHour = new Array(STORE.close - STORE.open + 1).fill(0);
  for (let i = 0; i < state.revealed; i++) {
    const t = dayTxns[i];
    const hr = new Date(t.ts).getHours();
    const idx = Math.min(realByHour.length - 1, Math.max(0, hr - STORE.open + 1));
    realByHour[idx] += t.amount;
  }
  const nowIdx = Math.round(
    (state.simNow - openTs) / (closeTs - openTs) * (projByHour.length - 1)
  );
  for (let i = 0; i < projByHour.length; i++) {
    cumProj += projByHour[i];
    cumReal += realByHour[i];
    projectedLine.push(Math.round(cumProj));
    realized.push(i <= nowIdx ? Math.round(cumReal) : null);
  }
  revChart.data.datasets[0].data = realized;
  revChart.data.datasets[1].data = projectedLine;
  revChart.update("none");

  // Department donut.
  deptChart.data.datasets[0].data = DEPARTMENTS.map((d) => Math.max(0, state.byDept[d.id]));
  deptChart.update("none");

  // Waterfall.
  const ns = s.net;
  const gp = s.grossProfit;
  const np = s.netProfit;
  waterfallMag = [ns, s.cogs, gp, s.opexAccrued, np];
  const base = [0, gp, 0, np >= 0 ? np : gp - s.opexAccrued, 0];
  const val = [ns, s.cogs, gp, s.opexAccrued, np];
  // For floating bars: base raises the bar, val is its height.
  waterfallChart.data.datasets[0].data = [0, gp, 0, Math.max(np, 0), Math.min(np, 0)];
  waterfallChart.data.datasets[1].data = [ns, s.cogs, gp, s.opexAccrued, Math.abs(np)];
  void base; void val;
  waterfallChart.update("none");
}

/* ------------------------------- DOM render ------------------------------ */

const el = (id) => document.getElementById(id);

function flash(node) {
  node.classList.remove("flash");
  // force reflow to restart the animation
  void node.offsetWidth;
  node.classList.add("flash");
}

let lastKpi = {};
function setKpi(id, text) {
  const node = el(id);
  if (node.textContent !== text) {
    node.textContent = text;
    flash(node);
  }
}

function renderKpis(s) {
  setKpi("kpi-sales", money(s.net));
  el("kpi-sales-sub").textContent =
    state.txnCount.toLocaleString() + " transactions · " +
    money(s.net && state.txnCount ? s.net / state.txnCount : 0) + " avg ticket";

  setKpi("kpi-gross", money(s.grossProfit));
  el("kpi-gross-sub").textContent = pct(s.grossMargin) + " gross margin";

  setKpi("kpi-opex", money(s.opexAccrued));
  el("kpi-opex-sub").textContent =
    pct(businessProgress(state.simNow)) + " of day · " + money(OPEX_TOTAL) + " budget";

  setKpi("kpi-net", money(s.netProfit));
  const netSub = el("kpi-net-sub");
  netSub.textContent = pct(s.netMargin) + " net margin";
  el("kpi-net").classList.toggle("neg", s.netProfit < 0);
  netSub.classList.toggle("neg", s.netProfit < 0);
}

function pnlRow({ label, today, eod, ns, kind = "", projNs }) {
  const pctCell =
    ns && today !== null ? pct(today / ns) : "—";
  const cls = "pnl-row " + kind;
  const todayCls = today < 0 ? "num neg" : "num";
  const eodCls = eod < 0 ? "num neg" : "num";
  return `<tr class="${cls}">
    <td class="ln">${label}</td>
    <td class="${todayCls}">${today === null ? "" : money(today)}</td>
    <td class="num pct-col">${kind.includes("total") || kind.includes("strong") ? pctCell : ""}</td>
    <td class="${eodCls}">${eod === null ? "" : money(eod)}</td>
  </tr>`;
}

function renderPnl(s) {
  const ns = s.net;
  const pNs = projected.net;
  const opexProgress = businessProgress(state.simNow);

  let html = "";
  html += pnlRow({ label: "Gross Sales", today: s.gross, eod: projected.gross, ns });
  html += pnlRow({ label: "Less: Returns & Allowances", today: -s.returns, eod: -projected.returns, ns });
  html += pnlRow({ label: "Net Sales", today: ns, eod: pNs, ns, kind: "strong" });
  html += pnlRow({ label: "Cost of Goods Sold", today: -s.cogs, eod: -projected.cogs, ns });
  html += pnlRow({ label: "Gross Profit", today: s.grossProfit, eod: projected.grossProfit, ns, kind: "strong total" });

  html += `<tr class="pnl-section"><td colspan="4">Operating Expenses</td></tr>`;
  for (const o of OPEX) {
    html += pnlRow({
      label: o.name,
      today: -o.amount * opexProgress,
      eod: -o.amount,
      ns,
    });
  }
  html += pnlRow({
    label: "Total Operating Expenses",
    today: -s.opexAccrued,
    eod: -OPEX_TOTAL,
    ns,
    kind: "total",
  });

  const projNet = projected.grossProfit - OPEX_TOTAL;
  html += pnlRow({
    label: "Net Operating Income",
    today: s.netProfit,
    eod: projNet,
    ns,
    kind: "strong total net",
  });

  el("pnl-body").innerHTML = html;
}

const FEED_MAX = 14;
function renderFeed() {
  if (pendingFeed.length === 0) return;
  const feed = el("feed");
  // Newest first; take the most recent reveals.
  const items = pendingFeed.splice(0, pendingFeed.length).reverse();
  for (const tx of items) {
    const dept = DEPARTMENTS.find((d) => d.id === tx.deptId);
    const li = document.createElement("li");
    li.className = "feed-item" + (tx.isReturn ? " is-return" : "");
    li.innerHTML = `
      <span class="fi-time">${fmtTime(tx.ts)}</span>
      <span class="fi-dot" style="background:${dept.color}"></span>
      <span class="fi-dept">${dept.name}</span>
      <span class="fi-amt">${tx.isReturn ? "−" : ""}${money(Math.abs(tx.amount), true)}</span>
    `;
    feed.prepend(li);
  }
  while (feed.children.length > FEED_MAX) feed.removeChild(feed.lastChild);
}

function renderStatus() {
  const open = state.simNow >= openTs && state.simNow < closeTs && businessProgress(state.simNow) < 1;
  const realClosed = Date.now() >= closeTs;
  const statusEl = el("store-status");
  if (businessProgress(state.simNow) >= 1) {
    statusEl.textContent = "● Day Complete";
    statusEl.className = "store-status closed";
  } else if (open) {
    statusEl.textContent = "● Open";
    statusEl.className = "store-status open";
  } else {
    statusEl.textContent = "● Closed";
    statusEl.className = "store-status closed";
  }
  el("as-of").textContent = "as of " + fmtClock(state.simNow);

  const prog = businessProgress(state.simNow);
  el("day-fill").style.width = (prog * 100).toFixed(1) + "%";
  el("day-pct").textContent = Math.round(prog * 100) + "%";

  el("dept-total-note").textContent = money(snapshotCache.net) + " net sales";

  // Sales velocity (transactions/hour right now).
  const hr = new Date(state.simNow).getHours();
  const w = HOUR_WEIGHTS[hr] || 0;
  const rate = Math.round((w / HOUR_TOTAL_WEIGHT) * dayTxns.length);
  el("feed-rate").textContent = open ? "≈ " + rate + " sales/hr now" : "store closed";

  // Live pill reflects mode.
  const pill = el("live-pill");
  if (state.mode === "replay") {
    el("live-label").textContent = "REPLAY " + state.speed + "×";
    pill.classList.add("replay");
  } else {
    el("live-label").textContent = realClosed ? "FINAL" : "LIVE";
    pill.classList.remove("replay");
  }
}

/* ------------------------------- Main loop ------------------------------- */

let snapshotCache = snapshot();
let renderAccumulator = 0;

function tick() {
  const real = Date.now();
  const dt = real - state.lastFrame;
  state.lastFrame = real;

  if (state.mode === "live") {
    state.simNow = clampNow(real);
  } else {
    state.simNow = Math.min(closeTs, state.simNow + dt * state.speed);
    if (state.simNow >= closeTs) {
      // Replay finished — settle on the completed day.
      state.speed = 0;
    }
  }

  revealUpTo(state.simNow);

  // Render at ~5fps to keep it smooth and cheap.
  renderAccumulator += dt;
  if (renderAccumulator >= 200 || pendingFeed.length) {
    renderAccumulator = 0;
    snapshotCache = snapshot();
    renderKpis(snapshotCache);
    renderPnl(snapshotCache);
    renderFeed();
    renderStatus();
    updateCharts(snapshotCache);
  }

  requestAnimationFrame(tick);
}

/* --------------------------------- Reset --------------------------------- */

function resetTotals() {
  state.revealed = 0;
  state.gross = 0;
  state.returns = 0;
  state.cogs = 0;
  state.txnCount = 0;
  for (const d of DEPARTMENTS) state.byDept[d.id] = 0;
  pendingFeed.length = 0;
  el("feed").innerHTML = "";
}

/* ------------------------------- Controls -------------------------------- */

function setMode(mode) {
  el("btn-live").classList.toggle("is-active", mode === "live");
  el("btn-replay").classList.toggle("is-active", mode === "replay");
  state.mode = mode;
}

function goLive() {
  setMode("live");
  state.speed = 1;
  resetTotals();
  state.simNow = clampNow(Date.now());
  revealUpTo(state.simNow);
}

function replayDay() {
  setMode("replay");
  resetTotals();
  state.simNow = openTs;
  // Compress the ~13-hour day into ~90 seconds of viewing.
  state.speed = Math.round((closeTs - openTs) / 90000);
}

/* --------------------------------- Boot ---------------------------------- */

function boot() {
  el("store-location").textContent = "Main Street Store";
  initCharts();

  el("btn-live").addEventListener("click", goLive);
  el("btn-replay").addEventListener("click", replayDay);

  // Seed with the day so far.
  revealUpTo(state.simNow);
  snapshotCache = snapshot();
  renderKpis(snapshotCache);
  renderPnl(snapshotCache);
  renderFeed();
  renderStatus();
  updateCharts(snapshotCache);

  state.lastFrame = Date.now();
  requestAnimationFrame(tick);
}

boot();
