# Git Branching Playground & Real-Time Dashboard 🌿

A hands-on Git learning tool with a real-time branch dashboard powered by a local Node.js server.

---

## 🚀 Quick Start — 2 Steps

### Step 1 — Start the Dashboard Server

Open your terminal, go to the project folder, and run:

```bash
cd /Users/abhijayhome/projects/git-branches
node server.js
```

You will see:
```
🚀 Git Branch Dashboard Server
📁 Repository: /Users/abhijayhome/projects/git-branches
✅ Server running on http://localhost:3001
📊 Dashboard: http://localhost:3001/dashboard.html
👁  Watching .git/refs/heads/ for real-time branch changes...
```

Keep this terminal open. The server must stay running.

---

### Step 2 — Open the App in Browser

Open either URL in Chrome:

| URL | What it opens |
|---|---|
| `http://localhost:3001/index.html` | Git Learning Playground (with launcher button) |
| `http://localhost:3001/dashboard.html` | Real-Time Git Branch Dashboard |

---

## 🗺️ How to Use the Dashboard

### The Dashboard Has 3 Zones

```
┌──────────────┬─────────────────────┬──────────────┐
│   SIDEBAR    │   BRANCH CARDS      │  COMMIT LOG  │
│              │   (main panel)      │   (right)    │
│ - Repo info  │                     │              │
│ - WS status  │  One card per       │  All commits │
│ - Branch     │  branch. Shows:     │  listed      │
│   list       │  SHA, message,      │  newest      │
│ - Status     │  author, actions    │  first       │
│ - Actions    │                     │              │
└──────────────┴─────────────────────┴──────────────┘
│            COMMIT INSPECTOR (bottom drawer)        │
│  Click any commit to see full SHA, author, date    │
└────────────────────────────────────────────────────┘
```

---

## ⎇ How to Switch Branches

### Option A — From the Dashboard (no terminal needed)
1. Open `http://localhost:3001/dashboard.html`
2. Find the branch card (e.g. `feature1`)
3. Click the **`⎇ Switch`** button on that card
4. The whole website switches to that branch instantly

### Option B — From the Terminal (dashboard updates live)
```bash
git switch feature1
```
The dashboard detects this in ~50ms and updates the branch tree automatically — no refresh needed.

---

## 🌿 How to Create a New Branch

### From the Dashboard
1. Click **`+ New Branch`** in the sidebar
2. Type the branch name (e.g. `feature/payment`)
3. Select which branch to create from (e.g. `main`)
4. Click **Create Branch**

The new branch appears on the dashboard immediately.

### From the Terminal (dashboard tracks it live)
```bash
git checkout -b feature/payment
# OR
git switch -c feature/payment
```

---

## ⌥ How to Merge a Branch

### From the Dashboard
1. Find the source branch card (e.g. `feature1`)
2. Click **`⌥ Merge`** button on that card
3. A dialog shows: `feature1 → main` (merges source INTO your current branch)
4. Click **Merge Branch** to confirm

### From the Terminal
```bash
git switch main        # go to target branch first
git merge feature1     # merge feature into it
```

---

## ✕ How to Delete a Branch

### From the Dashboard
1. Find the branch card
2. Click **`✕ Delete`**
3. A confirmation dialog appears
4. Check **Force delete (-D)** if the branch was never merged
5. Click **Delete**

> ⚠️ `main` and `master` are protected — Delete button is disabled for them.

### From the Terminal
```bash
git branch -d feature1    # safe delete (only if merged)
git branch -D feature1    # force delete (even if not merged)
```

---

## 🔍 How to Inspect a Commit (SHA Inspector)

1. Click any commit row in the **Commit Log** panel (right side)
2. OR click the commit box inside any **Branch Card**
3. The **Commit Inspector drawer** slides up from the bottom
4. You see: Full SHA, Short SHA, Author, Date, Message, Branch
5. Click any field to **copy it to clipboard**

---

## ⬆️ How to Push a Branch to GitHub

### From the Dashboard
1. Switch to the branch you want to push
2. Click **`Push`** button in the top bar
3. It runs `git push --set-upstream origin <branch>` automatically

### From the Terminal
```bash
git push --set-upstream origin feature1
# shorthand after first push:
git push
```

---

## 🔄 How to Fetch Latest Changes

### From the Dashboard
- Click **`Fetch All`** in the sidebar
- It runs `git fetch --all --prune` and refreshes the branch list

### From the Terminal
```bash
git fetch --all --prune
```

---

## 🔴 What the Live Dot Means (Status Indicators)

| Indicator | Meaning |
|---|---|
| 🟢 Green dot in top bar | WebSocket connected — dashboard is live |
| 🟢 Green dot on launcher button | Server is running |
| ⬆️ `1 ahead` pill on branch card | Your branch has 1 commit that origin doesn't have yet (needs push) |
| ⬇️ `1 behind` pill on branch card | Origin has 1 commit your branch doesn't have (needs pull/merge) |
| `M 2` in Working Tree | 2 modified files not yet staged |
| `S 1` in Working Tree | 1 file staged, ready to commit |
| `? 3` in Working Tree | 3 untracked files |

---

## 🎨 Branch Card Color Coding

| Branch Name Pattern | Colour | Icon |
|---|---|---|
| `main` / `master` | 🟢 Green | 🌿 |
| `feature/*` / `feat/*` | 🔵 Blue | ✨ |
| `bugfix/*` / `fix/*` | 🟡 Amber | 🔧 |
| `hotfix/*` | 🔴 Red | 🚨 |
| `release/*` | 🟣 Purple | 🚀 |
| `docs/*` | 🩵 Cyan | 📚 |
| Other | ⬜ Grey | ⎇ |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `R` | Refresh branch list and commit log |
| `Esc` | Close any open modal or commit inspector |

---

## ⚠️ Troubleshooting

**Dashboard shows "Server not reachable"**
→ You forgot to run `node server.js`. Open a terminal and start it.

**Branch switch failed**
→ You have uncommitted changes. Either commit them or stash them first:
```bash
git stash        # save changes temporarily
git switch main  # now switch safely
git stash pop    # restore your changes
```

**Merge conflict detected**
→ Dashboard will show a red toast. Go to terminal and resolve conflicts:
```bash
# After running merge that caused conflict:
git status                    # see which files conflict
# Edit those files and resolve
git add .
git commit -m "resolved merge conflict"
```

**Port 3001 already in use**
→ Kill the old process:
```bash
lsof -ti:3001 | xargs kill -9
node server.js
```

---

## 📁 Project Files

| File | Purpose |
|---|---|
| `server.js` | Backend: REST API + WebSocket + file watcher |
| `dashboard.html` | Real-time Git Dashboard page |
| `dashboard.css` | Dashboard styles |
| `dashboard.js` | Dashboard frontend logic |
| `index.html` | Git Learning Playground |
| `style.css` | Playground styles |
| `app.js` | Playground simulator logic |

---

## 🔁 Typical Learning Workflow

```
1. node server.js              → start the server
2. Open dashboard in browser   → http://localhost:3001/dashboard.html
3. Create a new branch         → click "+ New Branch" in sidebar
4. Make code changes           → edit files in your editor
5. Commit from terminal        → git add . && git commit -m "message"
   (dashboard updates live)
6. Switch branches             → click "Switch" on any card
7. Merge when ready            → click "Merge" on the feature card
8. Delete merged branch        → click "Delete" on the card
9. Push to GitHub              → click "Push" in top bar
```

This is the same workflow professional teams use every day.
