# Git Branching Visualizer & Interactive Playground 🌿

An interactive, visual educational web application designed to help developers master Git branching workflows, merging, switching, terminal commands, and commit history graphs.

![Git Branching Visualizer](https://img.shields.io/badge/Git-Branching--Playground-blueviolet?style=for-the-badge&logo=git)

## 🚀 Key Features

- **Interactive Git Terminal Simulator**: Run `git commit`, `git branch`, `git checkout`, `git switch`, `git merge`, `git log`, and `git status` directly in a simulated in-browser terminal.
- **Real-Time SVG Commit Graph**: Dynamic visualization of commit nodes, parent links, merge commits, and active branch pointers (`main`, `feature/*`, `HEAD`).
- **Interactive Workflow Guides**: Visual step-by-step walkthroughs for **Feature Branch Workflow**, **GitHub Flow**, and **Gitflow**. Load preset branch structures into the visualizer with one click!
- **Searchable Command Reference Cheatsheet**: Copy-paste ready commands with descriptions, categories, and direct "Run in Simulator" shortcuts.
- **Guided Interactive Challenges**: 4 interactive levels to test and solidify your understanding of Git branching operations.
- **Dark & Light Mode**: Built with a sleek glassmorphism UI design, responsive layout, and theme toggling.

---

## 🛠️ Essential Git Branching Commands Quick Reference

### View & Create Branches
```bash
# List all branches
git branch

# Create a new branch
git branch <branch-name>

# Create and switch to a new branch (Classic)
git checkout -b <branch-name>

# Create and switch to a new branch (Modern)
git switch -c <branch-name>
```

### Switch & Merge Branches
```bash
# Switch to an existing branch
git switch <branch-name>
# or
git checkout <branch-name>

# Merge a branch into your current active branch
git merge <branch-name>
```

### Clean Up & Inspection
```bash
# Delete a merged branch
git branch -d <branch-name>

# Display commit log history
git log

# Check status of working directory & HEAD pointer
git status
```

---

## 💻 How to Run Locally

Simply open `index.html` in any web browser, or serve it using any local static file server:

```bash
npx serve .
# or
python3 -m http.server 8000
```
Then navigate to `http://localhost:8000`.
