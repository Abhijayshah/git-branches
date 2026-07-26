/**
 * Git Branching Masterclass & Interactive Engine
 * Advanced state simulator, CLI parser, SVG graph engine, guided lessons, and telemetry monitor.
 */

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // 1. Core State Engine
    // =========================================================================
    
    let state = {
        commits: {},       // hash -> { id, hash, shortHash, message, parents: [], lane: 0 }
        branches: {},      // branchName -> commitHash
        remotes: {},       // 'origin/branchName' -> commitHash
        head: { type: 'branch', target: 'main' }, // type: 'branch' | 'commit'
        stashStack: [],    // [ { id, message, commitHash } ]
        activeCommitHash: null,
        commitCounter: 1,
        activeTab: 'tab-visualizer',
        completedChallenges: new Set()
    };

    // Initialize Default Repository Graph (Reflecting actual real-world multi-branch state)
    function resetToDefaultRepoState() {
        state.commits = {};
        state.branches = {};
        state.remotes = {};
        state.stashStack = [];
        state.head = { type: 'branch', target: 'main' };
        state.commitCounter = 1;

        const c1 = createCommitObject("Initial commit", []);
        const c2 = createCommitObject("Add index.html & style.css", [c1.hash]);
        const c3 = createCommitObject("Merge conflict v1.0.1", [c2.hash]);

        // main branch path
        const c4_main = createCommitObject("Update readme and docs", [c3.hash]);
        const c5_main = createCommitObject("Production v1.0.2 release", [c4_main.hash]);
        state.branches['main'] = c5_main.hash;
        state.remotes['origin/main'] = c5_main.hash;

        // feature1 branch path
        const c4_f1 = createCommitObject("Add feature1 branch.md notes", [c3.hash]);
        const c5_f1 = createCommitObject("Add command table to branch.md", [c4_f1.hash]);
        state.branches['feature1'] = c5_f1.hash;
        state.remotes['origin/feature1'] = c5_f1.hash;

        // feature2 branch path
        const c4_f2 = createCommitObject("Feature2 updated with branch2", [c3.hash]);
        state.branches['feature2'] = c4_f2.hash;
        state.remotes['origin/feature2'] = c4_f2.hash;

        // Active HEAD set to main
        state.head = { type: 'branch', target: 'main' };
        state.activeCommitHash = c5_main.hash;

        renderAll();
    }

    function createCommitObject(message, parents = []) {
        const id = state.commitCounter++;
        const hash = generateHash();
        const shortHash = hash.substring(0, 7);
        const commit = {
            id,
            hash,
            shortHash,
            message,
            parents: [...parents],
            timestamp: new Date().toLocaleTimeString()
        };
        state.commits[hash] = commit;
        return commit;
    }

    function generateHash() {
        return Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    }

    function getHeadCommitHash() {
        if (state.head.type === 'branch') {
            return state.branches[state.head.target];
        } else {
            return state.head.target;
        }
    }

    // =========================================================================
    // 2. Tab Navigation & Theme Toggle
    // =========================================================================
    
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            navTabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            state.activeTab = targetTab;

            if (targetTab === 'tab-visualizer') {
                setTimeout(renderGraph, 50);
            } else if (targetTab === 'tab-status-monitor') {
                renderStatusMonitor();
            }
        });
    });

    const themeBtn = document.getElementById('theme-toggle-btn');
    themeBtn.addEventListener('click', () => {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', nextTheme);
    });

    // =========================================================================
    // 3. Interactive CLI Terminal Simulator
    // =========================================================================
    
    const terminalOutput = document.getElementById('terminal-output');
    const terminalForm = document.getElementById('terminal-form');
    const terminalInput = document.getElementById('terminal-input');
    const btnClearTerminal = document.getElementById('btn-clear-terminal');

    terminalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const cmdText = terminalInput.value.trim();
        if (!cmdText) return;

        appendLog(`$ ${cmdText}`, 'cmd-input');
        executeGitCommand(cmdText);
        terminalInput.value = '';
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    });

    btnClearTerminal.addEventListener('click', () => {
        terminalOutput.innerHTML = '';
    });

    document.querySelectorAll('.chip-cmd').forEach(btn => {
        btn.addEventListener('click', () => {
            const cmd = btn.getAttribute('data-cmd');
            terminalInput.value = cmd;
            terminalInput.focus();
        });
    });

    function appendLog(text, className = 'cmd-info') {
        const div = document.createElement('div');
        div.className = `log-entry ${className}`;
        div.textContent = text;
        terminalOutput.appendChild(div);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    function executeGitCommand(rawCmd) {
        const parts = rawCmd.split(/\s+/);
        const mainCmd = parts[0];

        if (mainCmd === 'clear') {
            terminalOutput.innerHTML = '';
            return;
        }

        if (mainCmd === 'help') {
            appendLog(`🎓 Professional Git Developer Command Suite:`, 'system-msg');
            appendLog(`  git status                    - Check branch & working tree state`, 'hint-msg');
            appendLog(`  git branch [-a|-d <bname>]    - List or delete branches`, 'hint-msg');
            appendLog(`  git checkout -b <name>        - Create and switch to new branch`, 'hint-msg');
            appendLog(`  git switch <branch>           - Switch active branch`, 'hint-msg');
            appendLog(`  git commit -m "msg"           - Record a new commit`, 'hint-msg');
            appendLog(`  git merge <branch>            - 3-way merge target branch into HEAD`, 'hint-msg');
            appendLog(`  git rebase <target>           - Rebase current branch onto target`, 'hint-msg');
            appendLog(`  git stash / git stash pop     - Save or restore uncommitted work`, 'hint-msg');
            appendLog(`  git cherry-pick <hash>        - Copy specific commit onto HEAD`, 'hint-msg');
            appendLog(`  git reset --hard HEAD~1       - Rewind commit history`, 'hint-msg');
            appendLog(`  git revert <hash>             - Safely inverse a commit`, 'hint-msg');
            appendLog(`  git fetch / git push          - Remote repository sync`, 'hint-msg');
            appendLog(`  git log --oneline             - View compact commit history`, 'hint-msg');
            appendLog(`  git reset                     - Reset demo repository graph`, 'hint-msg');
            return;
        }

        if (mainCmd !== 'git') {
            appendLog(`Command '${mainCmd}' not recognized. Type 'help' for instructions.`, 'cmd-error');
            return;
        }

        const subCmd = parts[1];
        if (!subCmd) {
            appendLog(`git: missing subcommand. Try 'git status' or 'help'.`, 'cmd-error');
            return;
        }

        // --- git status ---
        if (subCmd === 'status') {
            if (state.head.type === 'branch') {
                appendLog(`On branch ${state.head.target}`, 'cmd-success');
                const remoteHash = state.remotes[`origin/${state.head.target}`];
                const localHash = state.branches[state.head.target];
                if (remoteHash && remoteHash === localHash) {
                    appendLog(`Your branch is up to date with 'origin/${state.head.target}'.`, 'cmd-info');
                } else if (remoteHash) {
                    appendLog(`Your branch and 'origin/${state.head.target}' have diverged.`, 'cmd-info');
                }
                appendLog(`nothing to commit, working tree clean`, 'cmd-info');
            } else {
                appendLog(`HEAD detached at ${state.head.target.substring(0, 7)}`, 'cmd-info');
            }
            return;
        }

        // --- git commit ---
        if (subCmd === 'commit') {
            let msg = "Developer commit #" + state.commitCounter;
            const mIndex = parts.indexOf('-m');
            if (mIndex !== -1 && parts[mIndex + 1]) {
                msg = parts.slice(mIndex + 1).join(' ').replace(/^["']|["']$/g, '');
            }

            const currentParent = getHeadCommitHash();
            const parents = currentParent ? [currentParent] : [];
            const newCommit = createCommitObject(msg, parents);

            if (state.head.type === 'branch') {
                state.branches[state.head.target] = newCommit.hash;
            } else {
                state.head.target = newCommit.hash;
            }

            state.activeCommitHash = newCommit.hash;
            appendLog(`[${state.head.type === 'branch' ? state.head.target : 'detached'} ${newCommit.shortHash}] ${newCommit.message}`, 'cmd-success');
            renderAll();
            checkChallenges('commit', { msg });
            return;
        }

        // --- git branch ---
        if (subCmd === 'branch') {
            if (parts.length === 2 || parts[2] === '-a' || parts[2] === '-v') {
                appendLog(`Local & Remote Branches:`, 'system-msg');
                Object.keys(state.branches).forEach(b => {
                    const isHead = state.head.type === 'branch' && state.head.target === b;
                    appendLog(`${isHead ? '* ' : '  '}${b} -> ${state.commits[state.branches[b]]?.shortHash || ''}`, isHead ? 'cmd-success' : 'cmd-info');
                });
                Object.keys(state.remotes).forEach(r => {
                    appendLog(`  remotes/${r}`, 'cmd-info');
                });
                return;
            }

            if (parts[2] === '-d' || parts[2] === '-D') {
                const bDelete = parts[3];
                if (!bDelete || !state.branches[bDelete]) {
                    appendLog(`error: branch '${bDelete}' not found.`, 'cmd-error');
                    return;
                }
                if (state.head.type === 'branch' && state.head.target === bDelete) {
                    appendLog(`error: Cannot delete branch '${bDelete}' checked out at HEAD`, 'cmd-error');
                    return;
                }
                delete state.branches[bDelete];
                appendLog(`Deleted branch ${bDelete}.`, 'cmd-success');
                renderAll();
                checkChallenges('delete-branch', { branch: bDelete });
                return;
            }

            const newBranchName = parts[2];
            if (state.branches[newBranchName]) {
                appendLog(`fatal: A branch named '${newBranchName}' already exists.`, 'cmd-error');
                return;
            }

            const headCommit = getHeadCommitHash();
            state.branches[newBranchName] = headCommit;
            appendLog(`Created branch '${newBranchName}' at ${headCommit ? headCommit.substring(0, 7) : 'HEAD'}.`, 'cmd-success');
            renderAll();
            checkChallenges('create-branch', { branch: newBranchName });
            return;
        }

        // --- git checkout / git switch ---
        if (subCmd === 'checkout' || subCmd === 'switch') {
            if (parts[2] === '-b' || parts[2] === '-c') {
                const newBranchName = parts[3];
                if (!newBranchName) {
                    appendLog(`fatal: missing branch name`, 'cmd-error');
                    return;
                }
                const headCommit = getHeadCommitHash();
                state.branches[newBranchName] = headCommit;
                state.head = { type: 'branch', target: newBranchName };
                appendLog(`Switched to a new branch '${newBranchName}'`, 'cmd-success');
                renderAll();
                checkChallenges('checkout-b', { branch: newBranchName });
                return;
            }

            const targetName = parts[2];
            if (!targetName) {
                appendLog(`fatal: missing branch or commit target`, 'cmd-error');
                return;
            }

            if (state.branches[targetName]) {
                state.head = { type: 'branch', target: targetName };
                state.activeCommitHash = state.branches[targetName];
                appendLog(`Switched to branch '${targetName}'`, 'cmd-success');
                renderAll();
                checkChallenges('checkout', { branch: targetName });
                return;
            }

            const commit = Object.values(state.commits).find(c => c.hash.startsWith(targetName) || c.shortHash === targetName);
            if (commit) {
                state.head = { type: 'commit', target: commit.hash };
                state.activeCommitHash = commit.hash;
                appendLog(`Note: switching to '${commit.shortHash}'. You are in 'detached HEAD' state.`, 'cmd-info');
                renderAll();
                return;
            }

            appendLog(`error: pathspec '${targetName}' did not match any branch or commit.`, 'cmd-error');
            return;
        }

        // --- git merge ---
        if (subCmd === 'merge') {
            const branchToMerge = parts[2];
            if (!branchToMerge || !state.branches[branchToMerge]) {
                appendLog(`merge: branch '${branchToMerge}' not found`, 'cmd-error');
                return;
            }

            const currentHeadHash = getHeadCommitHash();
            const sourceHash = state.branches[branchToMerge];

            if (currentHeadHash === sourceHash) {
                appendLog(`Already up to date.`, 'cmd-info');
                return;
            }

            const currentBranchName = state.head.type === 'branch' ? state.head.target : 'HEAD';
            const mergeMsg = `Merge branch '${branchToMerge}' into ${currentBranchName}`;
            const mergeCommit = createCommitObject(mergeMsg, [currentHeadHash, sourceHash]);

            if (state.head.type === 'branch') {
                state.branches[state.head.target] = mergeCommit.hash;
            } else {
                state.head.target = mergeCommit.hash;
            }

            state.activeCommitHash = mergeCommit.hash;
            appendLog(`Merge made by the 'ort' strategy.`, 'cmd-success');
            appendLog(`[${currentBranchName} ${mergeCommit.shortHash}] ${mergeMsg}`, 'cmd-success');
            renderAll();
            checkChallenges('merge', { source: branchToMerge, target: currentBranchName });
            return;
        }

        // --- git rebase ---
        if (subCmd === 'rebase') {
            const targetBranch = parts[2];
            if (!targetBranch || !state.branches[targetBranch]) {
                appendLog(`rebase: target branch '${targetBranch}' not found`, 'cmd-error');
                return;
            }

            const targetHash = state.branches[targetBranch];
            const currentHeadHash = getHeadCommitHash();

            if (state.head.type === 'branch') {
                // Point current branch onto target branch
                const rebasedCommit = createCommitObject(`Rebased commit on ${targetBranch}`, [targetHash]);
                state.branches[state.head.target] = rebasedCommit.hash;
                state.activeCommitHash = rebasedCommit.hash;
                appendLog(`Successfully rebased and updated refs/heads/${state.head.target}.`, 'cmd-success');
                renderAll();
            }
            return;
        }

        // --- git stash ---
        if (subCmd === 'stash') {
            const action = parts[2];
            if (!action || action === 'push' || action === 'save') {
                const stashId = state.stashStack.length;
                const headHash = getHeadCommitHash();
                state.stashStack.push({
                    id: stashId,
                    message: `WIP on ${state.head.type === 'branch' ? state.head.target : 'HEAD'}: ${state.commits[headHash]?.shortHash || ''}`,
                    commitHash: headHash
                });
                appendLog(`Saved working directory state stash@{${stashId}}`, 'cmd-success');
                renderAll();
                checkChallenges('stash', {});
                return;
            }

            if (action === 'pop') {
                if (state.stashStack.length === 0) {
                    appendLog(`No stash entries found.`, 'cmd-error');
                    return;
                }
                const popped = state.stashStack.pop();
                appendLog(`Applied and dropped ${popped.message}`, 'cmd-success');
                renderAll();
                return;
            }

            if (action === 'list') {
                appendLog(`Stash Stack:`, 'system-msg');
                state.stashStack.forEach((s, idx) => {
                    appendLog(`stash@{${idx}}: ${s.message}`, 'cmd-info');
                });
                return;
            }
        }

        // --- git cherry-pick ---
        if (subCmd === 'cherry-pick') {
            const targetHash = parts[2];
            if (!targetHash) {
                appendLog(`cherry-pick: commit hash required`, 'cmd-error');
                return;
            }

            const targetCommit = Object.values(state.commits).find(c => c.hash.startsWith(targetHash) || c.shortHash === targetHash);
            if (!targetCommit) {
                appendLog(`error: bad revision '${targetHash}'`, 'cmd-error');
                return;
            }

            const currentHeadHash = getHeadCommitHash();
            const cpCommit = createCommitObject(`[cherry-pick] ${targetCommit.message}`, [currentHeadHash]);
            if (state.head.type === 'branch') {
                state.branches[state.head.target] = cpCommit.hash;
            }
            state.activeCommitHash = cpCommit.hash;
            appendLog(`[${state.head.type === 'branch' ? state.head.target : 'HEAD'} ${cpCommit.shortHash}] Cherry-picked commit`, 'cmd-success');
            renderAll();
            return;
        }

        // --- git push ---
        if (subCmd === 'push') {
            if (state.head.type === 'branch') {
                const bName = state.head.target;
                state.remotes[`origin/${bName}`] = state.branches[bName];
                appendLog(`To https://github.com/Abhijayshah/git-branches.git`, 'cmd-success');
                appendLog(` * [updated] ${bName} -> origin/${bName}`, 'cmd-success');
                renderAll();
            }
            return;
        }

        // --- git fetch & pull ---
        if (subCmd === 'fetch') {
            appendLog(`From https://github.com/Abhijayshah/git-branches.git`, 'cmd-info');
            appendLog(` * [up to date] main -> origin/main`, 'cmd-success');
            return;
        }

        // --- git log ---
        if (subCmd === 'log') {
            appendLog(`Commit History:`, 'system-msg');
            const sortedCommits = Object.values(state.commits).sort((a, b) => b.id - a.id);
            sortedCommits.forEach(c => {
                const branchPtrs = Object.keys(state.branches).filter(b => state.branches[b] === c.hash);
                const remotePtrs = Object.keys(state.remotes).filter(r => state.remotes[r] === c.hash);
                const isHeadHere = getHeadCommitHash() === c.hash;

                let ptrs = [];
                if (isHeadHere) ptrs.push(`HEAD -> ${state.head.type === 'branch' ? state.head.target : 'detached'}`);
                ptrs.push(...branchPtrs.filter(b => b !== (state.head.type === 'branch' ? state.head.target : null)));
                ptrs.push(...remotePtrs);

                const ptrStr = ptrs.length > 0 ? ` (${ptrs.join(', ')})` : '';
                appendLog(`* ${c.shortHash}${ptrStr} ${c.message}`, 'cmd-success');
            });
            return;
        }

        // --- git reset ---
        if (subCmd === 'reset') {
            resetToDefaultRepoState();
            appendLog(`Repository graph reset to default state.`, 'cmd-info');
            return;
        }

        appendLog(`git: '${subCmd}' is not recognized in this simulator. Try 'help'.`, 'cmd-error');
    }

    // =========================================================================
    // 4. SVG Commit Tree Graph Renderer
    // =========================================================================
    
    const svgEdgesLayer = document.getElementById('edges-layer');
    const svgNodesLayer = document.getElementById('nodes-layer');
    const svgBranchesLayer = document.getElementById('branches-layer');
    const inspectorContent = document.getElementById('inspector-content');
    const currentHeadDisplay = document.getElementById('current-head-display');
    const stashCountDisplay = document.getElementById('stash-count-display');

    function renderAll() {
        if (currentHeadDisplay) {
            currentHeadDisplay.textContent = state.head.type === 'branch' ? state.head.target : state.head.target.substring(0, 7);
        }
        if (stashCountDisplay) {
            stashCountDisplay.textContent = state.stashStack.length;
        }
        renderGraph();
        renderInspector();
        renderStatusMonitor();
    }

    function calculateGraphLayout() {
        const commits = Object.values(state.commits).sort((a, b) => a.id - b.id);
        const startX = 60;
        const spacingX = 90;
        const startY = 70;
        const spacingY = 60;

        commits.forEach((commit, index) => {
            commit.x = startX + index * spacingX;

            if (commit.parents.length === 0) {
                commit.lane = 0;
            } else if (commit.parents.length === 1) {
                const parent = state.commits[commit.parents[0]];
                if (!parent) {
                    commit.lane = 0;
                } else {
                    const siblingCommits = commits.filter(c => c.parents.includes(parent.hash) && c.id < commit.id);
                    commit.lane = siblingCommits.length > 0 ? parent.lane + siblingCommits.length : parent.lane;
                }
            } else {
                const parent0 = state.commits[commit.parents[0]];
                commit.lane = parent0 ? parent0.lane : 0;
            }

            commit.y = startY + commit.lane * spacingY;
        });
    }

    function renderGraph() {
        if (!svgEdgesLayer || !svgNodesLayer) return;

        svgEdgesLayer.innerHTML = '';
        svgNodesLayer.innerHTML = '';
        svgBranchesLayer.innerHTML = '';

        calculateGraphLayout();

        const commits = Object.values(state.commits);

        // 1. Draw Edges
        commits.forEach(commit => {
            commit.parents.forEach(parentHash => {
                const parent = state.commits[parentHash];
                if (parent) {
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    const d = generateEdgeBezierPath(parent.x, parent.y, commit.x, commit.y);
                    path.setAttribute('d', d);
                    path.setAttribute('class', 'connection-edge');
                    path.setAttribute('stroke', getLaneColor(parent.lane));
                    svgEdgesLayer.appendChild(path);
                }
            });
        });

        // 2. Draw Commit Nodes
        commits.forEach(commit => {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('class', 'commit-node');
            group.setAttribute('transform', `translate(${commit.x}, ${commit.y})`);

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('r', '14');
            circle.setAttribute('class', 'commit-circle');
            circle.setAttribute('stroke', getLaneColor(commit.lane));
            
            if (state.activeCommitHash === commit.hash) {
                circle.setAttribute('stroke-width', '4');
                circle.setAttribute('fill', 'var(--accent-blue)');
            }

            const hashText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            hashText.setAttribute('y', '32');
            hashText.setAttribute('text-anchor', 'middle');
            hashText.setAttribute('class', 'commit-text');
            hashText.textContent = commit.shortHash;

            const msgText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            msgText.setAttribute('y', '-22');
            msgText.setAttribute('text-anchor', 'middle');
            msgText.setAttribute('class', 'commit-label');
            msgText.textContent = commit.message.length > 18 ? commit.message.substring(0, 16) + '...' : commit.message;

            group.appendChild(circle);
            group.appendChild(hashText);
            group.appendChild(msgText);

            group.addEventListener('click', () => {
                state.activeCommitHash = commit.hash;
                renderAll();
            });

            svgNodesLayer.appendChild(group);
        });

        // 3. Draw Branch Badges
        Object.keys(state.branches).forEach((branchName, idx) => {
            const commitHash = state.branches[branchName];
            const commit = state.commits[commitHash];
            if (!commit) return;

            const badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            const offsetY = 46 + (idx * 22);
            badgeG.setAttribute('transform', `translate(${commit.x}, ${commit.y + offsetY})`);

            const isHeadBranch = state.head.type === 'branch' && state.head.target === branchName;
            const badgeColor = isHeadBranch ? 'var(--accent-green)' : getBranchColor(branchName);

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', '-40');
            rect.setAttribute('y', '-10');
            rect.setAttribute('width', '80');
            rect.setAttribute('height', '20');
            rect.setAttribute('class', 'branch-tag');
            rect.setAttribute('fill', badgeColor);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('y', '4');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('class', 'branch-tag-text');
            text.textContent = (isHeadBranch ? 'HEAD: ' : '') + branchName;

            badgeG.appendChild(rect);
            badgeG.appendChild(text);

            badgeG.addEventListener('click', (e) => {
                e.stopPropagation();
                state.head = { type: 'branch', target: branchName };
                state.activeCommitHash = commitHash;
                appendLog(`Switched to branch '${branchName}' via visual click`, 'cmd-success');
                renderAll();
            });

            svgBranchesLayer.appendChild(badgeG);
        });
    }

    function generateEdgeBezierPath(x1, y1, x2, y2) {
        if (y1 === y2) {
            return `M ${x1} ${y1} L ${x2} ${y2}`;
        }
        const dx = (x2 - x1) / 2;
        return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
    }

    function getLaneColor(lane) {
        const colors = ['#10b981', '#38bdf8', '#a855f7', '#f59e0b', '#f43f5e', '#06b6d4'];
        return colors[lane % colors.length];
    }

    function getBranchColor(name) {
        if (name === 'main' || name === 'master') return 'var(--branch-main)';
        if (name.includes('feature')) return 'var(--branch-feature)';
        if (name.includes('hotfix')) return 'var(--branch-hotfix)';
        if (name.includes('develop')) return 'var(--branch-develop)';
        return 'var(--accent-purple)';
    }

    function renderInspector() {
        if (!inspectorContent) return;

        if (!state.activeCommitHash || !state.commits[state.activeCommitHash]) {
            inspectorContent.textContent = 'Click on any commit node in the graph to inspect details.';
            return;
        }

        const c = state.commits[state.activeCommitHash];
        const branches = Object.keys(state.branches).filter(b => state.branches[b] === c.hash);
        const remotes = Object.keys(state.remotes).filter(r => state.remotes[r] === c.hash);
        const isHeadHere = getHeadCommitHash() === c.hash;

        inspectorContent.innerHTML = `
            <strong>Hash:</strong> <code>${c.shortHash}</code> | 
            <strong>Message:</strong> "${c.message}" | 
            <strong>Parents:</strong> ${c.parents.map(p => state.commits[p]?.shortHash || p.substring(0, 7)).join(', ') || 'None (root)'} | 
            <strong>Pointers:</strong> ${isHeadHere ? '<span style="color:var(--accent-green)">[HEAD]</span> ' : ''}${branches.map(b => `<span style="color:var(--accent-cyan)">[${b}]</span>`).join(' ')} ${remotes.map(r => `<span style="color:var(--accent-amber)">[${r}]</span>`).join(' ')}
        `;
    }

    // Quick Action Buttons
    document.getElementById('btn-quick-commit')?.addEventListener('click', () => {
        executeGitCommand(`git commit -m "Quick commit #${state.commitCounter}"`);
    });

    document.getElementById('btn-quick-branch')?.addEventListener('click', () => {
        const bName = `feature-${Math.floor(Math.random() * 90 + 10)}`;
        executeGitCommand(`git checkout -b ${bName}`);
    });

    document.getElementById('btn-quick-stash')?.addEventListener('click', () => {
        executeGitCommand(`git stash`);
    });

    document.getElementById('btn-reset-repo')?.addEventListener('click', () => {
        resetToDefaultRepoState();
        appendLog(`Demo repository reset!`, 'cmd-info');
    });

    // Toolbar Action Dialogs
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action');
            if (action === 'merge-dialog') {
                const target = prompt('Enter branch to merge into current HEAD:', 'feature1');
                if (target) executeGitCommand(`git merge ${target}`);
            } else if (action === 'rebase-dialog') {
                const target = prompt('Enter target branch to rebase onto:', 'main');
                if (target) executeGitCommand(`git rebase ${target}`);
            } else if (action === 'cherry-dialog') {
                const hash = prompt('Enter commit hash to cherry-pick:', 'c418d2e');
                if (hash) executeGitCommand(`git cherry-pick ${hash}`);
            } else if (action === 'stash-pop') {
                executeGitCommand(`git stash pop`);
            } else if (action === 'push') {
                executeGitCommand(`git push`);
            } else if (action === 'fetch') {
                executeGitCommand(`git fetch`);
            }
        });
    });

    // =========================================================================
    // 5. Developer Deck & Cheatsheet
    // =========================================================================
    
    const deckData = [
        { cat: 'staging', cmd: 'git status', desc: 'Show modified files, staged changes, and current branch state.' },
        { cat: 'staging', cmd: 'git diff --stat', desc: 'Summary of changed files with additions and deletions count.' },
        { cat: 'staging', cmd: 'git add .', desc: 'Stage all modified and new files for the next commit.' },
        { cat: 'staging', cmd: 'git commit -m "msg"', desc: 'Record staged changes as a new commit snapshot.' },
        
        { cat: 'branching', cmd: 'git branch -a', desc: 'List all local and remote tracking branches.' },
        { cat: 'branching', cmd: 'git checkout -b <name>', desc: 'Create a new branch and immediately switch HEAD to it.' },
        { cat: 'branching', cmd: 'git switch <name>', desc: 'Switch active working environment to an existing branch.' },
        { cat: 'branching', cmd: 'git branch -d <name>', desc: 'Safely delete a branch that has already been merged.' },
        
        { cat: 'merging', cmd: 'git merge <branch>', desc: 'Combine history of target branch into your active branch (3-way merge).' },
        { cat: 'merging', cmd: 'git rebase main', desc: 'Re-apply feature commits on top of updated main for a linear graph.' },
        
        { cat: 'stashing', cmd: 'git stash', desc: 'Save uncommitted local changes to a stack so you can switch branches.' },
        { cat: 'stashing', cmd: 'git stash pop', desc: 'Restore and remove the most recently stashed changes.' },
        { cat: 'stashing', cmd: 'git cherry-pick <hash>', desc: 'Copy a specific commit from another branch onto your active branch.' },
        
        { cat: 'remote', cmd: 'git fetch', desc: 'Download new branches and commits from remote without merging.' },
        { cat: 'remote', cmd: 'git pull', desc: 'Fetch remote changes and immediately merge them into your active branch.' },
        { cat: 'remote', cmd: 'git push origin <branch>', desc: 'Upload local commits to the remote tracking branch.' },
        
        { cat: 'undoing', cmd: 'git reset --hard HEAD~1', desc: 'Rewind active branch by 1 commit and discard changes.' },
        { cat: 'undoing', cmd: 'git revert <hash>', desc: 'Create a new commit that safely reverses changes from a previous commit.' },
        { cat: 'undoing', cmd: 'git commit --amend', desc: 'Modify the message or files of the most recent commit.' }
    ];

    const deckContainer = document.getElementById('cheatsheet-cards-container');
    const deckSearch = document.getElementById('deck-search');
    const catTags = document.querySelectorAll('.cat-tag');
    let activeCategory = 'all';

    function renderDeck() {
        if (!deckContainer) return;
        deckContainer.innerHTML = '';

        const searchText = deckSearch ? deckSearch.value.toLowerCase() : '';

        const filtered = deckData.filter(item => {
            const matchesCat = activeCategory === 'all' || item.cat === activeCategory;
            const matchesSearch = item.cmd.toLowerCase().includes(searchText) ||
                                  item.desc.toLowerCase().includes(searchText) ||
                                  item.cat.toLowerCase().includes(searchText);
            return matchesCat && matchesSearch;
        });

        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'cmd-card glass-card';
            card.innerHTML = `
                <div class="cmd-card-header">
                    <span class="cmd-category">${item.cat}</span>
                    <button class="cmd-run-btn" title="Run command in terminal">▶ Run</button>
                </div>
                <div class="cmd-code-block">
                    <code>${item.cmd}</code>
                </div>
                <p>${item.desc}</p>
            `;

            card.querySelector('.cmd-run-btn').addEventListener('click', () => {
                document.getElementById('tab-btn-visualizer').click();
                terminalInput.value = item.cmd.replace('<name>', 'feature/demo').replace('<branch>', 'feature1').replace('<hash>', 'c418d2e');
                terminalInput.focus();
            });

            deckContainer.appendChild(card);
        });
    }

    if (deckSearch) {
        deckSearch.addEventListener('input', renderDeck);
    }

    catTags.forEach(tag => {
        tag.addEventListener('click', () => {
            catTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            activeCategory = tag.getAttribute('data-cat');
            renderDeck();
        });
    });

    renderDeck();

    // =========================================================================
    // 6. Interactive Guided Teacher Lessons
    // =========================================================================
    
    document.querySelectorAll('.run-lesson-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lessonNum = btn.getAttribute('data-lesson');
            runTeacherLesson(lessonNum);
            document.getElementById('tab-btn-visualizer').click();
        });
    });

    function runTeacherLesson(lessonNum) {
        resetToDefaultRepoState();

        if (lessonNum === '1') {
            appendLog(`🎓 LESSON 1: Feature Branch Cycle`, 'system-msg');
            executeGitCommand(`git checkout -b feature/doctor-booking`);
            executeGitCommand(`git commit -m "add slot picker UI"`);
            executeGitCommand(`git switch main`);
            executeGitCommand(`git merge feature/doctor-booking`);
        } else if (lessonNum === '2') {
            appendLog(`🎓 LESSON 2: 3-Way Merge & Conflict Concept`, 'system-msg');
            executeGitCommand(`git checkout -b feature/patient-portal`);
            executeGitCommand(`git commit -m "add patient dashboard"`);
            executeGitCommand(`git switch main`);
            executeGitCommand(`git commit -m "main branch doctor updates"`);
            executeGitCommand(`git merge feature/patient-portal`);
        } else if (lessonNum === '3') {
            appendLog(`🎓 LESSON 3: Git Rebase for Linear History`, 'system-msg');
            executeGitCommand(`git checkout feature2`);
            executeGitCommand(`git rebase main`);
        } else if (lessonNum === '4') {
            appendLog(`🎓 LESSON 4: Git Stash Work-in-Progress`, 'system-msg');
            executeGitCommand(`git checkout feature1`);
            executeGitCommand(`git stash`);
            executeGitCommand(`git switch main`);
        } else if (lessonNum === '5') {
            appendLog(`🎓 LESSON 5: Git Cherry-Pick Specific Commit`, 'system-msg');
            executeGitCommand(`git cherry-pick c418d2e`);
        } else if (lessonNum === '6') {
            appendLog(`🎓 LESSON 6: Undoing Commits with Reset`, 'system-msg');
            executeGitCommand(`git commit -m "Accidental commit"`);
            executeGitCommand(`git reset`);
        }
    }

    // =========================================================================
    // 7. Live Branch Status Telemetry Monitor
    // =========================================================================
    
    function renderStatusMonitor() {
        const tbody = document.getElementById('monitor-table-body');
        const activeEl = document.getElementById('mon-active-branch');
        const totalEl = document.getElementById('mon-total-branches');
        if (!tbody) return;

        const activeBranch = state.head.type === 'branch' ? state.head.target : 'HEAD (detached)';
        if (activeEl) activeEl.textContent = activeBranch;

        const branchNames = Object.keys(state.branches);
        if (totalEl) totalEl.textContent = branchNames.length;

        tbody.innerHTML = '';

        branchNames.forEach(bName => {
            const commitHash = state.branches[bName];
            const commit = state.commits[commitHash];
            const isHead = state.head.type === 'branch' && state.head.target === bName;
            const remoteHash = state.remotes[`origin/${bName}`];
            const isRemoteSynced = remoteHash && remoteHash === commitHash;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong style="color: ${isHead ? 'var(--accent-green)' : 'var(--accent-blue)'}">${bName}</strong></td>
                <td><code>${commit?.shortHash || 'N/A'}</code> - ${commit?.message || ''}</td>
                <td>${isHead ? '<span class="difficulty-badge easy">Active HEAD</span>' : '<span style="color:var(--text-muted)">Inactive</span>'}</td>
                <td>${bName === 'main' ? 'Base' : 'Merged / Active'}</td>
                <td>${isRemoteSynced ? 'Synced (origin/' + bName + ')' : '<span style="color:var(--accent-amber)">Ahead of remote</span>'}</td>
                <td>
                    ${!isHead ? `<button class="btn btn-secondary btn-sm switch-mon-btn" data-b="${bName}">Switch</button>` : ''}
                </td>
            `;

            tr.querySelector('.switch-mon-btn')?.addEventListener('click', () => {
                executeGitCommand(`git switch ${bName}`);
                document.getElementById('tab-btn-visualizer').click();
            });

            tbody.appendChild(tr);
        });
    }

    // =========================================================================
    // 8. Challenge Validator
    // =========================================================================
    
    function checkChallenges(actionType, payload) {
        if (actionType === 'checkout-b') {
            if (payload.branch === 'feature/login') completeChallenge(1);
        }
        if (actionType === 'commit') {
            if (state.completedChallenges.has(1)) completeChallenge(2);
        }
        if (actionType === 'stash') completeChallenge(3);
        if (actionType === 'merge') {
            if (payload.source === 'feature/login' && payload.target === 'main') completeChallenge(4);
        }
        if (actionType === 'delete-branch') {
            if (payload.branch === 'feature/login' && state.completedChallenges.has(4)) completeChallenge(5);
        }
    }

    function completeChallenge(id) {
        if (state.completedChallenges.has(id)) return;
        state.completedChallenges.add(id);

        const iconEl = document.getElementById(`ch-icon-${id}`);
        if (iconEl) iconEl.textContent = '✅';

        const cardEl = document.getElementById(`challenge-card-${id}`);
        if (cardEl) cardEl.style.borderColor = 'var(--accent-green)';

        const countEl = document.getElementById('completed-count');
        if (countEl) countEl.textContent = `${state.completedChallenges.size}/5`;

        appendLog(`🎉 Challenge ${id} Completed! Outstanding job!`, 'cmd-success');
    }

    document.querySelectorAll('.btn-start-challenge').forEach(btn => {
        btn.addEventListener('click', () => {
            const chId = btn.getAttribute('data-challenge');
            document.getElementById('tab-btn-visualizer').click();

            if (chId === '1') terminalInput.value = 'git checkout -b feature/login';
            else if (chId === '2') terminalInput.value = 'git commit -m "Add auth component"';
            else if (chId === '3') terminalInput.value = 'git stash';
            else if (chId === '4') terminalInput.value = 'git checkout main';
            else if (chId === '5') terminalInput.value = 'git branch -d feature/login';

            terminalInput.focus();
        });
    });

    // Initialize Engine State
    resetToDefaultRepoState();
});
