// Daily Check-In Dashboard — Supabase-backed.
// Logs a once-a-day check-in for each person, stored in a shared Supabase table.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PEOPLE = [
  { id: "reid", name: "Reid", color: "var(--reid)" },
  { id: "kaden", name: "Kaden", color: "var(--kaden)" },
];

const MOODS = [
  { id: "good", label: "Good", emoji: "😄" },
  { id: "okay", label: "Okay", emoji: "😐" },
  { id: "rough", label: "Rough", emoji: "😞" },
];

// --- Supabase client ---
const URL = window.SUPABASE_URL;
const KEY = window.SUPABASE_ANON_KEY;
const isConfigured =
  URL && KEY && !URL.startsWith("YOUR_") && !KEY.startsWith("YOUR_");

const supabase = isConfigured ? createClient(URL, KEY) : null;

// --- Date helpers (use local date, not UTC) ---
function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function prettyDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// --- Local cache, shaped { "YYYY-MM-DD": { reid: {mood, note}, kaden: {...} } } ---
let data = {};
// Draft mood selection before saving, per person.
const drafts = {};

function getEntry(dateKey, personId) {
  return (data[dateKey] && data[dateKey][personId]) || null;
}

// Pull all check-ins from Supabase into the local cache.
async function fetchData() {
  if (!supabase) return;
  const { data: rows, error } = await supabase
    .from("check_ins")
    .select("person, check_date, mood, note")
    .order("check_date", { ascending: false });

  if (error) {
    console.error("Failed to load check-ins:", error);
    showBanner(`Could not load check-ins: ${error.message}`, "error");
    return;
  }

  data = {};
  for (const row of rows) {
    if (!data[row.check_date]) data[row.check_date] = {};
    data[row.check_date][row.person] = { mood: row.mood, note: row.note || "" };
  }
}

// Insert or update today's check-in for a person.
async function upsertEntry(dateKey, personId, mood, note) {
  const { error } = await supabase
    .from("check_ins")
    .upsert(
      { person: personId, check_date: dateKey, mood, note },
      { onConflict: "person,check_date" }
    );
  if (error) throw error;
}

// Count consecutive days (ending today) with a check-in for a person.
function streakFor(personId) {
  let count = 0;
  const d = new Date();
  while (getEntry(todayKey(d), personId)) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

// --- Rendering ---
function renderToday() {
  const key = todayKey();
  document.getElementById("today-date").textContent = prettyDate(key);

  const cards = document.getElementById("cards");
  cards.innerHTML = "";

  PEOPLE.forEach((person) => {
    const existing = getEntry(key, person.id);
    const selectedMood = drafts[person.id] || (existing && existing.mood) || null;
    const note = existing ? existing.note : "";

    const card = document.createElement("div");
    card.className = "card";
    card.style.setProperty("--person-color", person.color);

    const statusText = existing
      ? `Checked in today — feeling ${existing.mood}`
      : "Not checked in yet today";

    card.innerHTML = `
      <div class="card-head">
        <div class="avatar">${person.name[0]}</div>
        <div>
          <div class="card-name">${person.name}</div>
          <div class="card-status">${statusText}</div>
        </div>
      </div>

      <div class="field">
        <span class="field-label">How are they doing?</span>
        <div class="moods" data-person="${person.id}">
          ${MOODS.map(
            (m) => `
            <button class="mood-btn ${selectedMood === m.id ? "selected" : ""}"
                    data-mood="${m.id}" type="button">
              <span class="emoji">${m.emoji}</span>${m.label}
            </button>`
          ).join("")}
        </div>
      </div>

      <div class="field">
        <span class="field-label">Notes</span>
        <textarea data-note="${person.id}" placeholder="What's going on with ${person.name}?">${escapeHtml(note)}</textarea>
      </div>

      <div class="card-actions">
        <span class="streak">🔥 <strong>${streakFor(person.id)}</strong>-day streak</span>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="saved-flag" data-flag="${person.id}">Saved ✓</span>
          <button class="save-btn" data-save="${person.id}" type="button">Save check-in</button>
        </div>
      </div>
    `;

    cards.appendChild(card);
  });

  wireCardEvents();
  renderFooter();
}

function wireCardEvents() {
  document.querySelectorAll(".moods").forEach((group) => {
    const personId = group.dataset.person;
    group.querySelectorAll(".mood-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        drafts[personId] = btn.dataset.mood;
        group.querySelectorAll(".mood-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
      });
    });
  });

  document.querySelectorAll("[data-save]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const personId = btn.dataset.save;
      const mood = drafts[personId] || (getEntry(todayKey(), personId) || {}).mood;
      if (!mood) {
        alert("Pick how they're doing first 🙂");
        return;
      }
      const note = document.querySelector(`[data-note="${personId}"]`).value.trim();

      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = "Saving…";
      try {
        await upsertEntry(todayKey(), personId, mood, note);
        await fetchData();
        const flag = document.querySelector(`[data-flag="${personId}"]`);
        if (flag) {
          flag.classList.add("show");
          setTimeout(() => flag.classList.remove("show"), 1500);
        }
        renderToday();
        renderHistory();
      } catch (err) {
        console.error(err);
        alert(`Could not save: ${err.message}`);
        btn.disabled = false;
        btn.textContent = original;
      }
    });
  });
}

function renderHistory() {
  const list = document.getElementById("history-list");
  const keys = Object.keys(data).sort().reverse().slice(0, 14);

  if (keys.length === 0) {
    list.innerHTML = `<div class="empty">No check-ins yet. Save one above to start the streak!</div>`;
    return;
  }

  list.innerHTML = keys
    .map((key) => {
      const day = data[key];
      const entries = PEOPLE.filter((p) => day[p.id])
        .map((p) => {
          const e = day[p.id];
          return `
          <div class="history-entry">
            <span class="history-dot dot-${e.mood}"></span>
            <span class="history-person">${p.name}</span>
            <span class="history-note">${e.note ? escapeHtml(e.note) : "<em>(no note)</em>"}</span>
          </div>`;
        })
        .join("");
      return `
        <div class="history-day">
          <div class="history-date">${prettyDate(key)}</div>
          <div class="history-entries">${entries}</div>
        </div>`;
    })
    .join("");
}

function renderFooter() {
  const summary = PEOPLE.map((p) => `${p.name}: ${streakFor(p.id)}-day streak`).join("  •  ");
  document.getElementById("streak-summary").textContent = summary;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function showBanner(message, kind = "info") {
  let banner = document.getElementById("banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "banner";
    banner.className = "banner";
    document.querySelector(".app").prepend(banner);
  }
  banner.classList.toggle("banner-error", kind === "error");
  banner.innerHTML = message;
}

// Clear all check-ins (deletes every row).
document.getElementById("clear-data").addEventListener("click", async () => {
  if (!supabase) return;
  if (!confirm("Delete ALL saved check-ins for everyone? This can't be undone.")) return;
  const { error } = await supabase.from("check_ins").delete().not("id", "is", null);
  if (error) {
    alert(`Could not clear data: ${error.message}`);
    return;
  }
  await fetchData();
  Object.keys(drafts).forEach((k) => delete drafts[k]);
  renderToday();
  renderHistory();
});

// --- Boot ---
async function init() {
  if (!isConfigured) {
    showBanner(
      "⚠️ Supabase isn't configured yet. Add your Project URL and anon key in " +
        "<code>config.js</code> (and run <code>supabase-schema.sql</code> in your Supabase project).",
      "error"
    );
    renderToday();
    renderHistory();
    return;
  }
  await fetchData();
  renderToday();
  renderHistory();
}

init();
