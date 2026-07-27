/**
 * Git Branch Dashboard — Client-Side Controller
 *
 * Responsibilities:
 * - WebSocket connection to server (port 3001) for real-time branch updates
 * - REST API calls: switch, create, merge, delete, push, fetch branches
 * - Branch card rendering with SHA inspector, ahead/behind sync status
 * - Commit log rendering with ref tags (branch labels) and click-to-inspect
 * - Toast notifications, modals, and sidebar search filter
 */

const API = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:3001';
const PROTECTED_BRANCHES = ['main', 'master'];

// ── Branch Type Color Map ─────────────────────────────────────────────────────
function getBranchStyle(name) {
    if (name === 'main' || name === 'master') {
        return { color: '#22c55e', icon: '🌿', label: 'main' };
    }
    if (name.startsWith('feature/') || name.startsWith('feat/') || name.startsWith('feature')) {
        return { color: '#4f8cff', icon: '✨', label: 'feature' };
    }
    if (name.startsWith('bugfix/') || name.startsWith('fix/') || name.startsWith('bug')) {
        return { color: '#f59e0b', icon: '🔧', label: 'bugfix' };
    }
    if (name.startsWith('hotfix/') || name.startsWith('hot/')) {
        return { color: '#ef4444', icon: '🚨', label: 'hotfix' };
    }
    if (name.startsWith('release/') || name.startsWith('rel/')) {
        return { color: '#a855f7', icon: '🚀', label: 'release' };
    }
    if (name.startsWith('docs/') || name.startsWith('doc/')) {
        return { color: '#06b6d4', icon: '📚', label: 'docs' };
    }
    if (name.startsWith('chore/')) {
        return { color: '#8b92a5', icon: '🔩', label: 'chore' };
    }
    return { color: '#8b92a5', icon: '⎇', label: 'branch' };
}

// ── State ─────────────────────────────────────────────────────────────────────
let state = {
    branches: [],
    currentBranch: '',
    status: { modified: 0, staged: 0, untracked: 0, isClean: true },
    ws: null,
    wsConnected: false,
    deletePendingBranch: null,
    sortByDate: true
};

// ── Toast Notifications ───────────────────────────────────────────────────────
function toast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<div class="toast-dot"></div><span>${message}</span>`;
    container.appendChild(el);

    setTimeout(() => {
        el.classList.add('toast-out');
        setTimeout(() => el.remove(), 250);
    }, duration);
}

// ── API Helpers ───────────────────────────────────────────────────────────────
async function api(endpoint, options = {}) {
    try {
        const res = await fetch(`${API}${endpoint}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        const data = await res.json();
        return { ok: res.ok, ...data };
    } catch (err) {
        return { ok: false, message: 'Server unreachable — is server.js running?' };
    }
}

// ── WebSocket Connection ──────────────────────────────────────────────────────
let reconnectTimer = null;

function connectWebSocket() {
    if (state.ws && (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING)) {
        return;
    }
    try {
        state.ws = new WebSocket(WS_URL);

        state.ws.addEventListener('open', () => {
            state.wsConnected = true;
            if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
            updateWsStatus(true);
        });

        state.ws.addEventListener('message', (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.event === 'branch-update') {
                    onLiveBranchUpdate(msg.data, msg.timestamp);
                }
            } catch (e) {}
        });

        state.ws.addEventListener('close', () => {
            state.wsConnected = false;
            updateWsStatus(false);
            if (!reconnectTimer) {
                reconnectTimer = setTimeout(() => {
                    reconnectTimer = null;
                    connectWebSocket();
                }, 3000);
            }
        });

        state.ws.addEventListener('error', () => {
            state.wsConnected = false;
            updateWsStatus(false);
        });
    } catch (err) {
        updateWsStatus(false);
    }
}

function updateWsStatus(connected) {
    const dot = document.getElementById('ws-dot');
    const text = document.getElementById('ws-status-text');
    const topbar = document.getElementById('topbar-ws-indicator');
    const label = document.getElementById('topbar-ws-label');
    const pulse = document.getElementById('topbar-ws-pulse');

    if (connected) {
        dot.className = 'ws-dot connected';
        text.textContent = 'Live — Changes detected instantly';
        topbar.className = 'topbar-ws-indicator';
        label.textContent = 'Live';
    } else {
        dot.className = 'ws-dot error';
        text.textContent = 'Disconnected — Reconnecting...';
        topbar.className = 'topbar-ws-indicator disconnected';
        label.textContent = 'Reconnecting...';
    }
}

function onLiveBranchUpdate(data, timestamp) {
    const sig = (data.currentBranch || '') + '|' +
                (data.branches || []).map(b => b.name + ':' + b.shortHash + ':' + b.ahead + ':' + b.behind).join(',') + '|' +
                JSON.stringify(data.status);

    if (state.lastSignature === sig) {
        return; // Data has not changed, skip re-rendering to prevent screen flickering
    }
    state.lastSignature = sig;

    state.branches = data.branches || [];
    state.currentBranch = data.currentBranch || '';
    state.status = data.status || state.status;

    renderAll();
    loadCommitLog(true);

    const t = new Date(timestamp);
    document.getElementById('stat-last-updated').textContent =
        t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function flashUpdateIndicator() {
    // Subtle indicator update without whole-screen flashing
    const pulse = document.getElementById('topbar-ws-pulse');
    if (pulse) {
        pulse.style.transform = 'scale(1.8)';
        setTimeout(() => pulse.style.transform = 'scale(1)', 400);
    }
}

// ── Initial Data Load ─────────────────────────────────────────────────────────
async function loadData() {
    const result = await api('/status');
    if (!result.ok || !result.data) {
        toast('Could not connect to dashboard server. Run: node server.js', 'error', 8000);
        renderErrorState();
        return;
    }

    state.branches = result.data.branches || [];
    state.currentBranch = result.data.currentBranch || '';
    state.status = result.data.status || {};

    renderAll();
    loadCommitLog();
}

function renderErrorState() {
    document.getElementById('branch-cards-grid').innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <strong>Server not reachable</strong>
            <p>Start the backend server first:</p>
            <code style="background:var(--bg-base);padding:6px 12px;border-radius:6px;margin-top:4px;">node server.js</code>
        </div>`;
    document.getElementById('sidebar-branch-list').innerHTML = '';
}

// ── Render All ────────────────────────────────────────────────────────────────
function renderAll() {
    renderSidebarBranchList();
    renderBranchCards();
    updateStats();
    updateSidebarRepoInfo();
    updateBranchFromSelects();
}

// ── Sidebar Branch List ───────────────────────────────────────────────────────
function renderSidebarBranchList() {
    const container = document.getElementById('sidebar-branch-list');
    const searchVal = document.getElementById('branch-search-input').value.toLowerCase();

    const filtered = state.branches.filter(b =>
        b.name.toLowerCase().includes(searchVal)
    );

    document.getElementById('branch-count-badge').textContent = state.branches.length;

    container.innerHTML = filtered.map(b => {
        const style = getBranchStyle(b.name);
        const isActive = b.name === state.currentBranch;
        return `
        <div class="sidebar-branch-item ${isActive ? 'active' : ''}"
             onclick="switchBranch('${b.name}')"
             title="Click to switch to ${b.name}">
            <div class="sbi-dot" style="background:${style.color}"></div>
            <span class="sbi-name ${isActive ? 'active' : ''}">${b.name}</span>
            <span class="sbi-sha">${b.shortHash || ''}</span>
        </div>`;
    }).join('');
}

// ── Branch Cards Grid ─────────────────────────────────────────────────────────
function renderBranchCards() {
    const container = document.getElementById('branch-cards-grid');
    const searchVal = document.getElementById('branch-search-input').value.toLowerCase();

    let branches = state.branches.filter(b =>
        b.name.toLowerCase().includes(searchVal)
    );

    // Sort
    if (state.sortByDate) {
        branches = [...branches].sort((a, b) =>
            new Date(b.date || 0) - new Date(a.date || 0)
        );
    } else {
        branches = [...branches].sort((a, b) => a.name.localeCompare(b.name));
    }

    if (branches.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>
                </svg>
                No branches found
            </div>`;
        return;
    }

    container.innerHTML = branches.map(b => renderBranchCard(b)).join('');
}

function renderBranchCard(b) {
    const style = getBranchStyle(b.name);
    const isCurrent = b.name === state.currentBranch;
    const isProtected = PROTECTED_BRANCHES.includes(b.name);
    const dateStr = b.date ? new Date(b.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '–';
    const timeAgo = b.date ? timeAgoStr(new Date(b.date)) : '';

    const aheadPill = b.ahead > 0 ? `<span class="sync-pill ahead">↑ ${b.ahead} ahead</span>` : '';
    const behindPill = b.behind > 0 ? `<span class="sync-pill behind">↓ ${b.behind} behind</span>` : '';
    const syncRow = (b.ahead > 0 || b.behind > 0) ? `<div class="bc-sync">${aheadPill}${behindPill}</div>` : '';

    const switchBtn = !isCurrent
        ? `<button class="bc-btn switch" onclick="event.stopPropagation();switchBranch('${b.name}')">⎇ Switch</button>`
        : `<button class="bc-btn" disabled style="opacity:0.4;cursor:default">✓ Current</button>`;

    const mergeBtn = !isCurrent
        ? `<button class="bc-btn merge" onclick="event.stopPropagation();openMergeDialog('${b.name}')">⌥ Merge</button>`
        : '';

    const deleteBtn = !isProtected && !isCurrent
        ? `<button class="bc-btn delete" onclick="event.stopPropagation();openDeleteDialog('${b.name}')">✕ Delete</button>`
        : `<span class="bc-protected">🔒 Protected</span>`;

    return `
    <div class="branch-card ${isCurrent ? 'is-current' : ''}"
         style="--branch-color:${style.color}"
         data-branch="${b.name}">

        <!-- Hover tooltip -->
        <div class="bc-tooltip">
            <div class="bc-tooltip-row"><span class="bc-tooltip-key">Full SHA:</span><span class="bc-tooltip-val">${b.fullHash || 'n/a'}</span></div>
            <div class="bc-tooltip-row"><span class="bc-tooltip-key">Author :</span><span class="bc-tooltip-val">${b.author || '–'}</span></div>
            <div class="bc-tooltip-row"><span class="bc-tooltip-key">Date   :</span><span class="bc-tooltip-val">${dateStr}</span></div>
            <div class="bc-tooltip-row"><span class="bc-tooltip-key">Type   :</span><span class="bc-tooltip-val">${style.label}</span></div>
        </div>

        <!-- Header -->
        <div class="bc-header">
            <div class="bc-icon" style="background:${style.color}20;color:${style.color}">
                ${style.icon}
            </div>
            <div class="bc-info">
                <div class="bc-name">${b.name}</div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:2px">
                    ${isCurrent ? '<span class="bc-badge current">HEAD</span>' : ''}
                    <span class="bc-badge type">${style.label}</span>
                </div>
            </div>
        </div>

        <!-- Commit Info -->
        <div class="bc-commit" onclick="inspectCommit('${b.fullHash || b.shortHash}','${escStr(b.message)}','${escStr(b.author)}','${b.date}','${b.shortHash}','${b.name}')">
            <div class="bc-commit-sha">${b.shortHash || '—'}</div>
            <div class="bc-commit-msg">${b.message || 'No commits yet'}</div>
            <div class="bc-commit-meta">
                <span>👤 ${b.author || '–'}</span>
                <span>🕐 ${timeAgo || dateStr}</span>
            </div>
        </div>

        <!-- Sync Status -->
        ${syncRow}

        <!-- Actions -->
        <div class="bc-actions">
            ${switchBtn}
            ${mergeBtn}
            ${deleteBtn}
        </div>
    </div>`;
}

// ── Stats Strip ───────────────────────────────────────────────────────────────
function updateStats() {
    document.getElementById('stat-local-count').textContent = state.branches.length;
    document.getElementById('stat-current-branch').textContent = state.currentBranch || '–';

    const s = state.status;
    const isClean = s.isClean;
    document.getElementById('stat-tree-status').textContent = isClean ? '✓ Clean' : `${s.modified + s.staged} changed`;
    document.getElementById('stat-tree-status').style.color = isClean ? 'var(--accent-green)' : 'var(--accent-amber)';

    // Update status counts
    document.getElementById('count-modified').textContent = s.modified || 0;
    document.getElementById('count-staged').textContent = s.staged || 0;
    document.getElementById('count-untracked').textContent = s.untracked || 0;

    // Last updated
    const now = new Date();
    document.getElementById('stat-last-updated').textContent =
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function updateSidebarRepoInfo() {
    // Derive repo name from URL pathname
    const parts = window.location.pathname.split('/').filter(Boolean);
    const repoName = parts[parts.length - 2] || document.title;

    document.getElementById('sidebar-repo-name').textContent = 'git-branches';
    document.getElementById('sidebar-current-branch').textContent = state.currentBranch || 'main';
    document.getElementById('topbar-current-branch').textContent = state.currentBranch || 'main';
    document.getElementById('topbar-branch-display').querySelector('span').textContent = state.currentBranch || 'main';
    document.getElementById('stat-current-branch').textContent = state.currentBranch || '–';
}

// ── Commit Log ────────────────────────────────────────────────────────────────
async function loadCommitLog(silent = false) {
    const container = document.getElementById('commit-log-container');
    if (!silent && (!container.children.length || container.querySelector('.empty-state'))) {
        container.innerHTML = '<div style="padding:20px;color:var(--text-muted);font-size:12px">Loading commits...</div>';
    }

    const result = await api('/log');
    if (!result.ok || !result.data) {
        if (!silent) container.innerHTML = '<div class="empty-state">Could not load commit log</div>';
        return;
    }

    const entries = result.data.filter(e => e.hash); // remove graph-only lines
    if (entries.length === 0) {
        container.innerHTML = '<div class="empty-state">No commits found</div>';
        return;
    }

    const logSig = entries.map(e => e.hash + ':' + e.refs).join('|');
    if (state.lastLogSig === logSig) {
        return; // Commit log hasn't changed, skip DOM refresh
    }
    state.lastLogSig = logSig;

    // Color mapping for branch lanes
    const branchColors = {};
    let colorIdx = 0;
    const palette = ['#4f8cff','#22c55e','#a855f7','#f59e0b','#ef4444','#06b6d4','#8b92a5'];

    const html = entries.map((entry, i) => {
        // Extract ref labels from refs string
        const refs = entry.refs ? entry.refs.split(',').map(r => r.trim()).filter(Boolean) : [];
        const refTags = refs.map(ref => {
            const isHead = ref.includes('HEAD');
            const isMain = ref.includes('main') || ref.includes('master');
            const isRemote = ref.startsWith('origin/');
            const style = getBranchStyle(ref.replace('HEAD -> ', '').replace('origin/', ''));
            return `<span class="commit-ref-tag" style="color:${style.color};border-color:${style.color}40;background:${style.color}10">${ref}</span>`;
        }).join('');

        // Lane color by first ref
        const laneRef = refs[0] ? refs[0].replace('HEAD -> ', '').replace('origin/', '') : 'other';
        if (!branchColors[laneRef]) {
            branchColors[laneRef] = palette[colorIdx % palette.length];
            colorIdx++;
        }
        const nodeColor = branchColors[laneRef] || '#8b92a5';

        return `
        <div class="commit-entry" onclick="inspectCommit('${entry.hash}','${escStr(entry.message)}','${escStr(entry.author)}','${entry.time}','${entry.shortHash}','${laneRef}')">
            <div class="commit-dot-col">
                <div class="commit-node" style="border-color:${nodeColor};background:${nodeColor}30"></div>
                ${i < entries.length - 1 ? '<div class="commit-line"></div>' : ''}
            </div>
            <div class="commit-details">
                <div class="commit-message">${entry.message || '(no message)'}</div>
                <div class="commit-meta">
                    <span class="commit-sha-tag" onclick="event.stopPropagation();copyToClipboard('${entry.hash}')" title="Click to copy full SHA">${entry.shortHash || ''}</span>
                    <span>${entry.author || ''}</span>
                    <span>${entry.time || ''}</span>
                    ${refTags ? `<div class="commit-refs">${refTags}</div>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = html;
}

// ── SHA Inspector ─────────────────────────────────────────────────────────────
function inspectCommit(hash, message, author, date, shortHash, branchName) {
    if (!hash || hash === 'undefined') return;

    const drawer = document.getElementById('inspector-drawer');
    const body = document.getElementById('inspector-body');

    drawer.classList.add('open');

    body.innerHTML = `
    <div class="inspector-grid">
        <div class="inspector-field">
            <div class="inspector-key">Short SHA</div>
            <div class="inspector-val copy-btn" onclick="copyToClipboard('${shortHash}')" title="Click to copy">${shortHash}</div>
        </div>
        <div class="inspector-field">
            <div class="inspector-key">Full SHA</div>
            <div class="inspector-val full-sha copy-btn" onclick="copyToClipboard('${hash}')" title="Click to copy">${hash}</div>
        </div>
        <div class="inspector-field">
            <div class="inspector-key">Branch</div>
            <div class="inspector-val">${branchName || '–'}</div>
        </div>
        <div class="inspector-field">
            <div class="inspector-key">Author</div>
            <div class="inspector-val">${author || '–'}</div>
        </div>
        <div class="inspector-field">
            <div class="inspector-key">Message</div>
            <div class="inspector-val">${message || '(no message)'}</div>
        </div>
        <div class="inspector-field">
            <div class="inspector-key">Date / Time</div>
            <div class="inspector-val">${date || '–'}</div>
        </div>
    </div>`;
}

// ── Actions ───────────────────────────────────────────────────────────────────
async function switchBranch(branchName) {
    if (branchName === state.currentBranch) {
        toast(`Already on '${branchName}'`, 'info');
        return;
    }

    if (state.status && !state.status.isClean) {
        const ok = confirm(`Working tree has uncommitted changes.\n\nSwitch to '${branchName}' anyway? (Unsaved changes may carry over)`);
        if (!ok) return;
    }

    toast(`Switching to '${branchName}'...`, 'info', 1500);
    const result = await api('/switch', {
        method: 'POST',
        body: JSON.stringify({ branch: branchName })
    });

    if (result.ok) {
        toast(`Switched to '${branchName}'`, 'success');
        await loadData();
        await loadCommitLog();
    } else {
        toast(`Switch failed: ${result.message}`, 'error');
    }
}

async function createBranch() {
    const name = document.getElementById('input-new-branch-name').value.trim();
    const from = document.getElementById('select-branch-from').value;

    if (!name) { toast('Branch name is required', 'warning'); return; }

    const result = await api('/create', {
        method: 'POST',
        body: JSON.stringify({ name, from })
    });

    closeModal('modal-create-branch');

    if (result.ok) {
        toast(`Branch '${name}' created`, 'success');
        await loadData();
        await loadCommitLog();
    } else {
        toast(`Create failed: ${result.message}`, 'error');
    }
}

async function mergeBranch() {
    const source = document.getElementById('select-merge-source').value;
    if (!source) { toast('Select a source branch', 'warning'); return; }

    const result = await api('/merge', {
        method: 'POST',
        body: JSON.stringify({ source })
    });

    closeModal('modal-merge');

    if (result.ok) {
        toast(`Merged '${source}' into '${state.currentBranch}'`, 'success');
        await loadData();
        await loadCommitLog();
    } else if (result.error === 'MERGE_CONFLICT') {
        toast('Merge conflict detected! Resolve in terminal.', 'error', 6000);
    } else {
        toast(`Merge failed: ${result.message}`, 'error');
    }
}

async function deleteBranch() {
    const name = state.deletePendingBranch;
    const force = document.getElementById('checkbox-force-delete').checked;
    if (!name) return;

    const result = await api(`/branch/${encodeURIComponent(name)}${force ? '?force=true' : ''}`, {
        method: 'DELETE'
    });

    closeModal('modal-delete');
    state.deletePendingBranch = null;

    if (result.ok) {
        toast(`Branch '${name}' deleted`, 'success');
        await loadData();
        await loadCommitLog();
    } else {
        toast(`Delete failed: ${result.message}`, 'error', 5000);
    }
}

async function pushBranch() {
    toast('Pushing...', 'info', 1500);
    const result = await api('/push', {
        method: 'POST',
        body: JSON.stringify({ branch: state.currentBranch, setUpstream: true })
    });
    if (result.ok) {
        toast(`Pushed '${state.currentBranch}' to origin`, 'success');
    } else {
        toast(`Push failed: ${result.message}`, 'error', 5000);
    }
}

async function fetchAll() {
    toast('Fetching all remotes...', 'info', 1500);
    const result = await api('/fetch', { method: 'POST' });
    if (result.ok) {
        toast('Fetched successfully', 'success');
        await loadData();
        await loadCommitLog();
    } else {
        toast(`Fetch failed: ${result.message}`, 'error');
    }
}

// ── Modals ────────────────────────────────────────────────────────────────────
function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function openCreateBranchDialog() {
    document.getElementById('input-new-branch-name').value = '';
    updateBranchFromSelects();
    openModal('modal-create-branch');
    setTimeout(() => document.getElementById('input-new-branch-name').focus(), 100);
}

function openMergeDialog(sourceBranch) {
    document.getElementById('merge-target-display').textContent = state.currentBranch || 'HEAD';
    updateMergeSourceSelect(sourceBranch);
    openModal('modal-merge');
}

function openDeleteDialog(branchName) {
    state.deletePendingBranch = branchName;
    document.getElementById('delete-branch-name-display').textContent = `"${branchName}"`;
    document.getElementById('checkbox-force-delete').checked = false;
    openModal('modal-delete');
}

function updateBranchFromSelects() {
    const fromSelect = document.getElementById('select-branch-from');
    if (!fromSelect) return;
    fromSelect.innerHTML = state.branches.map(b =>
        `<option value="${b.name}" ${b.name === state.currentBranch ? 'selected' : ''}>${b.name}</option>`
    ).join('');
}

function updateMergeSourceSelect(preselect) {
    const sel = document.getElementById('select-merge-source');
    sel.innerHTML = state.branches
        .filter(b => b.name !== state.currentBranch)
        .map(b => `<option value="${b.name}" ${b.name === preselect ? 'selected' : ''}>${b.name}</option>`)
        .join('');
}

// ── Clipboard ─────────────────────────────────────────────────────────────────
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        toast(`Copied: ${text.substring(0, 16)}...`, 'success', 1500);
    });
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function escStr(str) {
    return (str || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/\n/g, ' ');
}

function timeAgoStr(date) {
    const diff = Math.floor((Date.now() - date) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
}

// ── Event Listeners ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    // Sidebar collapse
    document.getElementById('sidebar-collapse-btn').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });
    document.getElementById('topbar-sidebar-toggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });

    // Search filter
    document.getElementById('branch-search-input').addEventListener('input', () => {
        renderSidebarBranchList();
        renderBranchCards();
    });

    // Sort button
    document.getElementById('btn-sort-branches').addEventListener('click', (e) => {
        state.sortByDate = !state.sortByDate;
        e.currentTarget.textContent = state.sortByDate ? 'Sort by name' : 'Sort by date';
        renderBranchCards();
    });

    // Quick action buttons
    document.getElementById('btn-new-branch').addEventListener('click', openCreateBranchDialog);
    document.getElementById('btn-fetch-all').addEventListener('click', fetchAll);
    document.getElementById('btn-refresh').addEventListener('click', async () => {
        await loadData();
        await loadCommitLog();
        toast('Refreshed', 'success', 1500);
    });

    // Top bar buttons
    document.getElementById('btn-push').addEventListener('click', pushBranch);
    document.getElementById('btn-merge-dialog').addEventListener('click', () => openMergeDialog(null));

    // Modal confirm buttons
    document.getElementById('btn-confirm-create-branch').addEventListener('click', createBranch);
    document.getElementById('btn-confirm-merge').addEventListener('click', mergeBranch);
    document.getElementById('btn-confirm-delete').addEventListener('click', deleteBranch);

    // Modal close buttons
    document.querySelectorAll('.modal-close, .btn-modal-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-modal');
            if (modalId) closeModal(modalId);
        });
    });

    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.add('hidden');
            }
        });
    });

    // Inspector close
    document.getElementById('inspector-close').addEventListener('click', () => {
        document.getElementById('inspector-drawer').classList.remove('open');
    });

    // Keyboard shortcut: Esc closes modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
            document.getElementById('inspector-drawer').classList.remove('open');
        }
    });

    // Keyboard shortcut: R = refresh
    document.addEventListener('keydown', (e) => {
        if (e.key === 'r' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT') {
            loadData();
            loadCommitLog();
        }
    });

    // Init
    loadData();
    connectWebSocket();
});
