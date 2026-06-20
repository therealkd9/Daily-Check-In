# Daily Check-In Dashboard

A simple, self-contained dashboard for checking in on **Reid** and **Kaden** every day.

## What it does

- **Daily check-in cards** for Reid and Kaden — log a mood (Good / Okay / Rough) and a note for each person.
- **Streak tracking** — counts consecutive days you've checked in on each person.
- **Recent history** — shows the last 14 days of check-ins at a glance.
- **No backend required** — everything is saved in your browser via `localStorage`.

## How to use

Just open `index.html` in any modern web browser.

1. Pick how each person is doing today.
2. Add an optional note.
3. Click **Save check-in**.

Come back each day to keep the streak going. Use **Clear all data** to wipe history.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure |
| `styles.css` | Styling / layout |
| `app.js` | Check-in logic + storage |

## Notes

Data lives only in the browser you use, on that device. To share check-ins
across devices, the storage layer in `app.js` would need to be swapped for a
shared backend — a natural next step if you want it.
