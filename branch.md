# 🌿 Git Branching Notes & Live Repository Log (`branch.md`)

> **Personal Study & Production Reference Guide**  
> Use this log to track active branches, ahead/behind commit statuses, and keep as a reference guide for your **Dr Heal Appointment Booking** production project.

---

## 📍 1. Current Repository Status (Live Snapshot)

- **Current Active Branch**: `feature1` (Checked out)
- **Working Tree State**: Clean (`nothing to commit, working tree clean`)
- **Local Branches**: `main`, `feature1`
- **Remote Branches**: `origin/main`, `origin/feature`

---

## 📊 2. Branch Relationship Matrix (Ahead / Behind Analysis)

| Branch Name | Latest Commit Hash & Message | Status relative to `main` | Status relative to Ancestor (`f36d8e9`) | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`feature1`** *(Active)* | `6cb2b30` ("added------- in the h1") | **1 commit ahead, 1 commit behind** | 1 commit ahead | Contains new changes in `index.html` `<h1>` |
| **`main`** | `294e0b7` ("minior changes in main branch") | **Base Branch** | 1 commit ahead | Has a direct commit on `main` |

---

## 💡 3. Teacher's Note: What Is Happening Under The Hood?

Notice how both `feature1` and `main` have **1 new commit each** after splitting from commit `f36d8e9`:

- **`feature1`** has commit `6cb2b30`
- **`main`** has commit `294e0b7`

Because both branches have moved forward independently:
1. When you switch to `main` and run `git merge feature1`, Git cannot do a simple *Fast-Forward* merge.
2. Git will attempt a **3-Way Merge**.
3. If `294e0b7` (on `main`) and `6cb2b30` (on `feature1`) modified the same lines in `index.html`, Git will trigger a **Merge Conflict**! This is a great opportunity to practice conflict resolution.

---

## 📜 4. Visual Commit Tree Graph

```text
* 6cb2b30 (HEAD -> feature1) added------- in the h1
| 
| * 294e0b7 (main) minior changes in main branch
|/  
* f36d8e9 merge conflict v.1.0.1
|\  
| * 8417443 Added advanced UI for learning Git commit tree graph
* | eb71bd8 Updated index and readme
* | 01418e8 added commint app.js
|/  
* acc15b8 style: improve CSS file and link to index.html
* 1256d9e first commit
```

---

## 🎓 5. Production Best Practices & Workflow (Dr Heal Project Reference)

### A. Core Production Rule
> **Rule #1:** NEVER write code or commit directly on `main` in a production environment (like Dr Heal). Always create feature branches:
> - `feature/doctor-schedule`
> - `feature/patient-auth`
> - `bugfix/appointment-cancellation`

### B. Standard Feature Development Cycle
1. **Start fresh from updated main:**
   ```bash
   git switch main
   git pull origin main
   git switch -c feature/appointment-booking
   ```
2. **Develop & Commit work:**
   ```bash
   git add .
   git commit -m "feat(booking): add time slot selector UI"
   ```
3. **Merge back to main:**
   ```bash
   git switch main
   git merge feature/appointment-booking
   git push origin main
   ```
4. **Delete completed feature branch:**
   ```bash
   git branch -d feature/appointment-booking
   ```

### C. Useful Commands for Branch Inspection
```bash
# Check current status and active branch
git status

# See detailed commit history graph across all branches
git log --oneline --graph --all

# Compare code differences between main and feature1
git diff main..feature1

# See which branches are merged into current branch
git branch --merged
```

---

## 📝 6. Learning Log History

- **Log #1 (Current)**:
  - Branch `feature1` created.
  - Added commit `6cb2b30` on `feature1`.
  - `main` has commit `294e0b7`.
  - Status: `feature1` is **1 commit ahead and 1 commit behind `main`**.
