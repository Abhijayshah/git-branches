/**
 * Git Branching Visualizer & Interactive Playground
 * Engine for state management, terminal simulation, SVG tree graph rendering, and educational challenges.
 */

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // 1. Initial State & Data Definitions
    // =========================================================================
    
    let state = {
        commits: {},       // hash -> { hash, shortHash, message, parents: [], lane: 0, x: 0, y: 0 }
        branches: {},      // branchName -> commitHash
        head: { type: 'branch', target: 'main' }, // type: 'branch' | 'commit'
        activeCommitHash: null,
        commitCounter: 1,
        activeTab: 'tab-visualizer',
        completedChallenges: new Set()
    };

    // Preset Default State
    function resetToDefaultRepoState() {
        state.commits = {};
        state.branches = {};
        state.head = { type: 'branch', target: 'main' };
        state.commitCounter = 1;

        const c1 = createCommitObject("Initial commit", []);
        const c2 = createCommitObject("Add index.html & style.css", [c1.hash]);
        const c3 = createCommitObject("Update readme with branch instructions", [c2.hash]);

        state.branches['main'] = c3.hash;
        
        // Add demo feature branch
        const c4 = createCommitObject("Hello from feature branch!", [c3.hash]);
        state.branches['feature'] = c4.hash;
        
        // Set HEAD back to main
        state.head = { type: 'branch', target: 'main' };
        state.activeCommitHash = c3.hash;

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
            }
        });
    });

    // Theme Toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    themeBtn.addEventListener('click', () => {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', nextTheme);
    });

    // =========================================================================
    // 3. Git Command Parser & Terminal Simulator
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

    // Quick Command Buttons
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

    function getHeadCommitHash() {
        if (state.head.type === 'branch') {
            return state.branches[state.head.target];
        } else {
            return state.head.target;
        }
    }

    function executeGitCommand(rawCmd) {
        const parts = rawCmd.split(/\s+/);
        const mainCmd = parts[0];

        if (mainCmd === 'clear') {
            terminalOutput.innerHTML = '';
            return;
        }

        if (mainCmd === 'help') {
            appendLog(`Available Commands:`, 'system-msg');
            appendLog(`  git commit -m "msg"     - Make a new commit on current HEAD`, 'hint-msg');
            appendLog(`  git branch <name>       - Create a new branch`, 'hint-msg');
            appendLog(`  git branch -d <name>    - Delete a branch`, 'hint-msg');
            appendLog(`  git checkout <branch>   - Switch to branch or commit`, 'hint-msg');
            appendLog(`  git checkout -b <name>  - Create and switch to new branch`, 'hint-msg');
            appendLog(`  git switch -c <name>    - Create and switch to new branch`, 'hint-msg');
            appendLog(`  git merge <branch>      - Merge target branch into current HEAD`, 'hint-msg');
            appendLog(`  git log                 - Show commit history`, 'hint-msg');
            appendLog(`  git status              - Show active branch & status`, 'hint-msg');
            appendLog(`  git reset               - Reset repository graph to default demo`, 'hint-msg');
            return;
        }

        if (mainCmd !== 'git') {
            appendLog(`Command not recognized: '${mainCmd}'. Type 'help' for instructions.`, 'cmd-error');
            return;
        }

        const subCmd = parts[1];

        if (!subCmd) {
            appendLog(`git: missing subcommand. Try 'git help' or 'git status'.`, 'cmd-error');
            return;
        }

        // --- git status ---
        if (subCmd === 'status') {
            if (state.head.type === 'branch') {
                appendLog(`On branch ${state.head.target}`, 'cmd-success');
                appendLog(`Your branch is up to date with origin/${state.head.target}.`, 'cmd-info');
                appendLog(`nothing to commit, working tree clean`, 'cmd-info');
            } else {
                appendLog(`HEAD detached at ${state.head.target.substring(0, 7)}`, 'cmd-info');
            }
            return;
        }

        // --- git commit ---
        if (subCmd === 'commit') {
            let msg = "Commit " + state.commitCounter;
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
            if (parts.length === 2) {
                // List branches
                appendLog(`Branches:`, 'system-msg');
                Object.keys(state.branches).forEach(b => {
                    const isHead = state.head.type === 'branch' && state.head.target === b;
                    appendLog(`${isHead ? '* ' : '  '}${b}`, isHead ? 'cmd-success' : 'cmd-info');
                });
                return;
            }

            if (parts[2] === '-d' || parts[2] === '-D') {
                const branchToDelete = parts[3];
                if (!branchToDelete) {
                    appendLog(`fatal: branch name required`, 'cmd-error');
                    return;
                }
                if (!state.branches[branchToDelete]) {
                    appendLog(`error: branch '${branchToDelete}' not found.`, 'cmd-error');
                    return;
                }
                if (state.head.type === 'branch' && state.head.target === branchToDelete) {
                    appendLog(`error: Cannot delete branch '${branchToDelete}' checked out at HEAD`, 'cmd-error');
                    return;
                }
                delete state.branches[branchToDelete];
                appendLog(`Deleted branch ${branchToDelete}.`, 'cmd-success');
                renderAll();
                checkChallenges('delete-branch', { branch: branchToDelete });
                return;
            }

            // Create new branch
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

        // --- git checkout & git switch ---
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
                appendLog(`fatal: missing branch or commit argument`, 'cmd-error');
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

            // Check if it's a valid commit hash
            const commit = Object.values(state.commits).find(c => c.hash.startsWith(targetName) || c.shortHash === targetName);
            if (commit) {
                state.head = { type: 'commit', target: commit.hash };
                state.activeCommitHash = commit.hash;
                appendLog(`Note: switching to '${commit.shortHash}'. You are in 'detached HEAD' state.`, 'cmd-info');
                renderAll();
                return;
            }

            appendLog(`error: pathspec '${targetName}' did not match any file(s) or branch known to git`, 'cmd-error');
            return;
        }

        // --- git merge ---
        if (subCmd === 'merge') {
            const branchToMerge = parts[2];
            if (!branchToMerge) {
                appendLog(`fatal: missing branch to merge`, 'cmd-error');
                return;
            }
            if (!state.branches[branchToMerge]) {
                appendLog(`merge: ${branchToMerge} - not something we can merge`, 'cmd-error');
                return;
            }

            const currentHeadHash = getHeadCommitHash();
            const sourceHash = state.branches[branchToMerge];

            if (currentHeadHash === sourceHash) {
                appendLog(`Already up to date.`, 'cmd-info');
                return;
            }

            // Perform merge commit (parents = [currentHead, sourceBranchHead])
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

        // --- git log ---
        if (subCmd === 'log') {
            appendLog(`Commit History:`, 'system-msg');
            const sortedCommits = Object.values(state.commits).sort((a, b) => b.id - a.id);
            sortedCommits.forEach(c => {
                const branchPtrs = Object.keys(state.branches).filter(b => state.branches[b] === c.hash);
                const isHeadHere = getHeadCommitHash() === c.hash;
                let ptrStr = '';
                if (isHeadHere || branchPtrs.length > 0) {
                    const ptrs = [];
                    if (isHeadHere) ptrs.push(`HEAD -> ${state.head.type === 'branch' ? state.head.target : 'detached'}`);
                    ptrs.push(...branchPtrs.filter(b => b !== (state.head.type === 'branch' ? state.head.target : null)));
                    ptrStr = ` (${ptrs.join(', ')})`;
                }
                appendLog(`commit ${c.shortHash}${ptrStr}`, 'cmd-success');
                appendLog(`    ${c.message}`, 'cmd-info');
            });
            return;
        }

        // --- git reset ---
        if (subCmd === 'reset') {
            resetToDefaultRepoState();
            appendLog(`Repository graph reset to default initial state.`, 'cmd-info');
            return;
        }

        appendLog(`git: '${subCmd}' is not a recognized git command in this simulator. Try 'help'.`, 'cmd-error');
    }

    // =========================================================================
    // 4. SVG Commit Graph Renderer Engine
    // =========================================================================
    
    const svgEdgesLayer = document.getElementById('edges-layer');
    const svgNodesLayer = document.getElementById('nodes-layer');
    const svgBranchesLayer = document.getElementById('branches-layer');
    const inspectorContent = document.getElementById('inspector-content');
    const currentHeadDisplay = document.getElementById('current-head-display');

    function renderAll() {
        currentHeadDisplay.textContent = state.head.type === 'branch' ? state.head.target : state.head.target.substring(0, 7);
        renderGraph();
        renderInspector();
    }

    function calculateGraphLayout() {
        const commits = Object.values(state.commits).sort((a, b) => a.id - b.id);
        const lanes = {}; // branch/path -> lane index
        let nextLane = 0;

        // Assign positions X, Y
        const startX = 60;
        const spacingX = 90;
        const startY = 70;
        const spacingY = 60;

        commits.forEach((commit, index) => {
            commit.x = startX + index * spacingX;

            // Determine lane
            if (commit.parents.length === 0) {
                commit.lane = 0;
            } else if (commit.parents.length === 1) {
                const parent = state.commits[commit.parents[0]];
                // If parent has other children or branch diverted
                const siblingCommits = commits.filter(c => c.parents.includes(parent.hash) && c.id < commit.id);
                if (siblingCommits.length > 0) {
                    commit.lane = parent.lane + siblingCommits.length;
                } else {
                    commit.lane = parent.lane;
                }
            } else {
                // Merge commit
                const parent0 = state.commits[commit.parents[0]];
                commit.lane = parent0.lane;
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

        // 3. Draw Branch Badges & HEAD
        const headCommitHash = getHeadCommitHash();

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
            rect.setAttribute('x', '-35');
            rect.setAttribute('y', '-10');
            rect.setAttribute('width', '70');
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
        const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4'];
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
        if (!state.activeCommitHash || !state.commits[state.activeCommitHash]) {
            inspectorContent.textContent = 'Click on any commit node in the graph to inspect details.';
            return;
        }

        const c = state.commits[state.activeCommitHash];
        const branches = Object.keys(state.branches).filter(b => state.branches[b] === c.hash);
        const isHeadHere = getHeadCommitHash() === c.hash;

        inspectorContent.innerHTML = `
            <strong>Hash:</strong> <code>${c.shortHash}</code> | 
            <strong>Message:</strong> "${c.message}" | 
            <strong>Parents:</strong> ${c.parents.map(p => state.commits[p]?.shortHash || p.substring(0, 7)).join(', ') || 'None (root)'} | 
            <strong>Pointers:</strong> ${isHeadHere ? '<span style="color:var(--accent-green)">[HEAD]</span> ' : ''}${branches.map(b => `<span style="color:var(--accent-cyan)">[${b}]</span>`).join(' ') || 'None'}
        `;
    }

    // Header Action Buttons
    document.getElementById('btn-quick-commit').addEventListener('click', () => {
        executeGitCommand(`git commit -m "Quick commit #${state.commitCounter}"`);
    });

    document.getElementById('btn-quick-branch').addEventListener('click', () => {
        const bName = `feature-${Math.floor(Math.random() * 90 + 10)}`;
        executeGitCommand(`git checkout -b ${bName}`);
    });

    document.getElementById('btn-reset-repo').addEventListener('click', () => {
        resetToDefaultRepoState();
        appendLog(`Demo repository reset!`, 'cmd-info');
    });

    // =========================================================================
    // 5. Workflows Tab & Preset Demos
    // =========================================================================
    
    document.querySelectorAll('.load-workflow-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const workflow = btn.getAttribute('data-workflow');
            loadWorkflowDemo(workflow);

            // Switch to Visualizer tab
            document.getElementById('tab-btn-visualizer').click();
        });
    });

    function loadWorkflowDemo(workflowType) {
        state.commits = {};
        state.branches = {};
        state.commitCounter = 1;

        if (workflowType === 'feature-branch') {
            const c1 = createCommitObject("Initial commit", []);
            const c2 = createCommitObject("Setup core structure", [c1.hash]);
            state.branches['main'] = c2.hash;

            state.head = { type: 'branch', target: 'feature/auth' };
            const c3 = createCommitObject("Add login form UI", [c2.hash]);
            const c4 = createCommitObject("Add authentication token logic", [c3.hash]);
            state.branches['feature/auth'] = c4.hash;

            appendLog(`Loaded 'Feature Branch Workflow' demo in simulator!`, 'cmd-success');
        } else if (workflowType === 'github-flow') {
            const c1 = createCommitObject("Initial commit", []);
            const c2 = createCommitObject("Production v1.0", [c1.hash]);
            state.branches['main'] = c2.hash;

            const c3 = createCommitObject("Create search bar component", [c2.hash]);
            const c4 = createCommitObject("Add search filters", [c3.hash]);
            state.branches['add-search-bar'] = c4.hash;

            const mergeCommit = createCommitObject("PR #12: Merge add-search-bar into main", [c2.hash, c4.hash]);
            state.branches['main'] = mergeCommit.hash;
            state.head = { type: 'branch', target: 'main' };

            appendLog(`Loaded 'GitHub Flow' demo in simulator!`, 'cmd-success');
        } else if (workflowType === 'gitflow') {
            const c1 = createCommitObject("Initial commit", []);
            const c2 = createCommitObject("Release 1.0", [c1.hash]);
            state.branches['main'] = c2.hash;

            const dev = createCommitObject("Start develop branch", [c2.hash]);
            state.branches['develop'] = dev.hash;

            const feat1 = createCommitObject("Work on dashboard UI", [dev.hash]);
            state.branches['feature/dashboard'] = feat1.hash;

            const hotfix = createCommitObject("Hotfix security patch", [c2.hash]);
            state.branches['hotfix/security'] = hotfix.hash;

            state.head = { type: 'branch', target: 'develop' };

            appendLog(`Loaded 'Gitflow Workflow' demo in simulator!`, 'cmd-success');
        }

        renderAll();
    }

    // =========================================================================
    // 6. Cheatsheet Data & Filtering
    // =========================================================================
    
    const cheatsheetData = [
        { cat: 'Branching Basics', cmd: 'git branch', desc: 'List all local branches in the current repository. The active branch is marked with an asterisk.' },
        { cat: 'Branching Basics', cmd: 'git branch <name>', desc: 'Create a new branch pointing to the current HEAD commit without switching to it.' },
        { cat: 'Switching', cmd: 'git checkout -b <name>', desc: 'Create a new branch and immediately switch HEAD to it.' },
        { cat: 'Switching', cmd: 'git switch -c <name>', desc: 'Modern syntax to create and switch to a new branch.' },
        { cat: 'Switching', cmd: 'git switch <name>', desc: 'Switch your active working environment to an existing branch.' },
        { cat: 'Merging', cmd: 'git merge <branch>', desc: 'Combine commits from the target branch into your current active branch.' },
        { cat: 'Cleanup', cmd: 'git branch -d <name>', desc: 'Delete a branch safely (only if it has already been merged).' },
        { cat: 'Inspection', cmd: 'git log --oneline --graph', desc: 'Display a compact ASCII graph of commit history and branch pointers.' },
        { cat: 'Inspection', cmd: 'git status', desc: 'Show working tree status and active checked-out branch.' }
    ];

    const cheatsheetContainer = document.getElementById('cheatsheet-cards-container');
    const cheatsheetSearch = document.getElementById('cheatsheet-search');

    function renderCheatsheet(filterText = '') {
        if (!cheatsheetContainer) return;
        cheatsheetContainer.innerHTML = '';

        const filtered = cheatsheetData.filter(item => 
            item.cmd.toLowerCase().includes(filterText.toLowerCase()) ||
            item.desc.toLowerCase().includes(filterText.toLowerCase()) ||
            item.cat.toLowerCase().includes(filterText.toLowerCase())
        );

        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'cmd-card glass-card';
            card.innerHTML = `
                <div class="cmd-card-header">
                    <span class="cmd-category">${item.cat}</span>
                    <button class="cmd-copy-btn" title="Run in simulator">▶ Run</button>
                </div>
                <div class="cmd-code-block">
                    <code>${item.cmd}</code>
                </div>
                <p>${item.desc}</p>
            `;

            card.querySelector('.cmd-copy-btn').addEventListener('click', () => {
                document.getElementById('tab-btn-visualizer').click();
                terminalInput.value = item.cmd.replace('<name>', 'feature/demo').replace('<branch>', 'feature/demo');
                terminalInput.focus();
            });

            cheatsheetContainer.appendChild(card);
        });
    }

    if (cheatsheetSearch) {
        cheatsheetSearch.addEventListener('input', (e) => {
            renderCheatsheet(e.target.value);
        });
    }

    renderCheatsheet();

    // =========================================================================
    // 7. Interactive Challenges Tracker
    // =========================================================================
    
    function checkChallenges(actionType, payload) {
        if (actionType === 'checkout-b' || actionType === 'create-branch') {
            if (payload.branch === 'feature/login') {
                completeChallenge(1);
            }
        }

        if (actionType === 'commit') {
            if (state.completedChallenges.has(1)) {
                completeChallenge(2);
            }
        }

        if (actionType === 'merge') {
            if (payload.source === 'feature/login' && payload.target === 'main') {
                completeChallenge(3);
            }
        }

        if (actionType === 'delete-branch') {
            if (payload.branch === 'feature/login' && state.completedChallenges.has(3)) {
                completeChallenge(4);
            }
        }
    }

    function completeChallenge(id) {
        if (state.completedChallenges.has(id)) return;
        state.completedChallenges.add(id);

        const iconEl = document.getElementById(`ch-icon-${id}`);
        if (iconEl) iconEl.textContent = '✅';

        const cardEl = document.getElementById(`challenge-card-${id}`);
        if (cardEl) cardEl.style.borderColor = 'var(--accent-green)';

        document.getElementById('completed-count').textContent = `${state.completedChallenges.size}/4`;
        appendLog(`🎉 Challenge ${id} Completed! Great job!`, 'cmd-success');
    }

    document.querySelectorAll('.btn-start-challenge').forEach(btn => {
        btn.addEventListener('click', () => {
            const chId = btn.getAttribute('data-challenge');
            document.getElementById('tab-btn-visualizer').click();

            if (chId === '1') {
                appendLog(`Challenge 1 Goal: Create and switch to a branch named 'feature/login'. Type: git checkout -b feature/login`, 'system-msg');
                terminalInput.value = 'git checkout -b feature/login';
            } else if (chId === '2') {
                appendLog(`Challenge 2 Goal: Make a commit on your feature branch. Type: git commit -m "Add login UI"`, 'system-msg');
                terminalInput.value = 'git commit -m "Add login UI"';
            } else if (chId === '3') {
                appendLog(`Challenge 3 Goal: Switch to main and merge feature/login. Type: git checkout main`, 'system-msg');
                terminalInput.value = 'git checkout main';
            } else if (chId === '4') {
                appendLog(`Challenge 4 Goal: Delete feature/login branch. Type: git branch -d feature/login`, 'system-msg');
                terminalInput.value = 'git branch -d feature/login';
            }

            terminalInput.focus();
        });
    });

    // Initialize Default State
    resetToDefaultRepoState();
});
