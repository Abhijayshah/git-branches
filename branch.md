# 🌿 Git Branching Notes & Live Repository Log (`branch.md`)

> **Personal Study & Production Reference Guide**  
> Use this log to track active branches, ahead/behind commit statuses, and keep as a reference guide for your **Dr Heal Appointment Booking** production project.

---

## 📍 1. Current Repository Status (Live Snapshot)

- **Current Active Branch**: `main` (Checked out)
- **Working Tree State**: Clean (`nothing to commit, working tree clean`)
- **Sync Status**: Up to date with `origin/main` (`HEAD -> main, origin/main, origin/HEAD`)
- **Local Branches**: `main`, `feature1`
- **Remote Branches**: `origin/main`, `origin/feature`, `origin/feature1`

---

## 📊 2. Branch Relationship Matrix (Ahead / Behind Analysis)

| Branch Name | Latest Commit Hash & Message | Status relative to `main` | Status relative to Remote (`origin/main`) | Description / State |
| :--- | :--- | :--- | :--- | :--- |
| **`main`** *(Active)* | `82184d2` ("merge conflict v.1.0.2----version added branch.md and modifed index.html") | **Base Branch (HEAD)** | **Up-to-date** | Contains 3-way merge of `feature1` + `main` |
| **`feature1`** | `c418d2e` ("added command run useful to remember") | **Fully Merged into `main`** | **Up-to-date with `origin/feature1`** | Work complete; ready for optional cleanup (`git branch -d feature1`) |

---

## 💡 3. Teacher's Note: What Just Happened Under The Hood?

🎉 **Awesome Progress!** You successfully executed a full feature branch lifecycle:

1. **Created & Developed on `feature1`**: Added commits `6cb2b30`, `b005e36`, and `c418d2e` (including your command reference table!).
2. **Executed 3-Way Merge**: Combined `main` (`294e0b7`) and `feature1` (`c418d2e`) into merge commit `82184d2`.
3. **Pushed to GitHub Remote**: `main` has been safely pushed to `origin/main`.
4. **Next Production Step (Clean up)**: Since `feature1`'s work is 100% inside `main`, you can safely delete the local feature branch when ready using:
   ```bash
   git branch -d feature1
   ```

---

## 📜 4. Visual Commit Tree Graph

```text
*   82184d2 (HEAD -> main, origin/main, origin/HEAD) merge conflict v.1.0.2----version added branch.md and modifed index.html
|\  
| * c418d2e (origin/feature1, feature1) added command run useful to remember
| * b005e36 branch.md file added
| * 6cb2b30 added------- in the h1
* | 294e0b7 minior changes in main branch
|/  
*   f36d8e9 merge conflict v.1.0.1
|\  
| * 8417443 (origin/feature) Added advanced UI for learning Git commit tree graph
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

#### 🛠️ Quick Command Reference Table

| Command | What it shows |
| :--- | :--- |
| `git status` | Modified, staged, and untracked files |
| `git diff --name-only` | Names of modified files (not staged) |
| `git diff --cached --name-only` | Names of staged files |
| `git show --name-only HEAD` | Files changed in the latest commit |
| `git diff main..feature1 --name-only` | Files different between `main` and `feature1` |
| `git diff --stat main..feature1` | Summary of changed files with insertions/deletions |
| `git log --stat` | Files changed in each commit |

---

## 📝 6. Learning Log History

- **Log #2 (Current - 2026-07-27)**:
  - Added custom command inspection table to `branch.md`.
  - Merged `feature1` into `main` via 3-way merge commit `82184d2`.
  - Successfully pushed `main` to `origin/main`.
  - Status: `main` is up-to-date with remote. `feature1` is fully merged.

- **Log #1 (2026-07-26)**:
  - Branch `feature1` created.
  - Added commit `6cb2b30` on `feature1`.
  - `main` had commit `294e0b7`.
  - Status: `feature1` was 1 commit ahead and 1 commit behind `main`.
