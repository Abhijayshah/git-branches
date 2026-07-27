/**
 * Git Branch Dashboard — Local Backend Server
 *
 * Features:
 * - REST API for all git operations (branches, commits, merge, switch, create, delete)
 * - WebSocket server for real-time push notifications
 * - chokidar file watcher on .git/refs/heads/ for instant branch change detection
 * - simple-git for all git operations (no raw shell exec)
 *
 * Start: node server.js
 * Default port: 3001
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const simpleGit = require('simple-git');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');

// ─── Configuration ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const REPO_PATH = process.env.REPO_PATH || process.cwd();

// ─── Init ─────────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const git = simpleGit(REPO_PATH);

app.use(cors());
app.use(express.json());

// Serve static dashboard files
app.use(express.static(REPO_PATH));

console.log(`\n🚀 Git Branch Dashboard Server`);
console.log(`📁 Repository: ${REPO_PATH}`);
console.log(`🌐 Server: http://localhost:${PORT}`);
console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html\n`);

// ─── WebSocket Broadcast ──────────────────────────────────────────────────────
function broadcast(event, data) {
    const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

wss.on('connection', (ws) => {
    console.log('🔌 New dashboard client connected');
    ws.send(JSON.stringify({ event: 'connected', data: { message: 'Real-time tracking active' } }));

    ws.on('close', () => {
        console.log('🔌 Dashboard client disconnected');
    });
});

// ─── chokidar File Watcher ─────────────────────────────────────────────────────
const refsPath = path.join(REPO_PATH, '.git', 'refs', 'heads');
const packedRefsPath = path.join(REPO_PATH, '.git', 'packed-refs');
const headPath = path.join(REPO_PATH, '.git', 'HEAD');

let updateTimeout = null;
let isUpdating = false;

function scheduleBranchUpdate(reason) {
    if (updateTimeout) clearTimeout(updateTimeout);
    updateTimeout = setTimeout(async () => {
        if (isUpdating) return;
        isUpdating = true;
        try {
            await broadcastBranchUpdate(reason);
        } catch (e) {
            console.error('Update schedule error:', e.message);
        } finally {
            isUpdating = false;
        }
    }, 300);
}

async function broadcastBranchUpdate(reason) {
    try {
        const data = await getBranchData();
        console.log(`📡 Broadcasting: ${reason}`);
        broadcast('branch-update', data);
    } catch (err) {
        console.error('Broadcast error:', err.message);
    }
}

// Watch for branch creation/deletion/changes
if (fs.existsSync(refsPath)) {
    chokidar.watch([refsPath, packedRefsPath, headPath], {
        persistent: true,
        ignoreInitial: true,
        ignored: [/\.lock$/, /~$/, /\.tmp$/],
        awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
    })
    .on('add', () => scheduleBranchUpdate('New branch detected'))
    .on('unlink', () => scheduleBranchUpdate('Branch deleted'))
    .on('change', () => scheduleBranchUpdate('Branch pointer changed'));

    console.log('👁  Watching .git/refs/heads/ for real-time branch changes...\n');
} else {
    console.warn('⚠️  .git/refs/heads/ not found — watcher not started');
}

// ─── Helper: Build Branch Data ────────────────────────────────────────────────
async function getBranchData() {
    const [rawBranchOutput, logRaw, statusSummary] = await Promise.all([
        git.raw(['branch', '-a', '-v', '--format=%(refname:short)|%(objectname:short)|%(objectname)|%(authorname)|%(committerdate:iso-strict)|%(subject)|%(upstream:track)']),
        git.log(['--oneline', '--graph', '--all', '--max-count=80']).catch(() => ({ all: [] })),
        git.status().catch(() => ({ current: '', modified: [], staged: [], not_added: [], deleted: [], isClean: () => true }))
    ]);

    const lines = (rawBranchOutput || '').trim().split('\n').filter(Boolean);
    const branches = [];
    const remoteBranches = [];

    for (const line of lines) {
        const parts = line.split('|');
        const name = (parts[0] || '').trim();
        const shortHash = (parts[1] || '').trim();
        const fullHash = (parts[2] || '').trim();
        const author = (parts[3] || '').trim();
        const date = (parts[4] || '').trim();
        const message = (parts[5] || '').trim();
        const track = (parts[6] || '').trim();

        if (!name || name === 'origin' || name === 'origin/HEAD') continue;

        let ahead = 0;
        let behind = 0;
        const aheadMatch = track.match(/ahead (\d+)/);
        const behindMatch = track.match(/behind (\d+)/);
        if (aheadMatch) ahead = parseInt(aheadMatch[1], 10) || 0;
        if (behindMatch) behind = parseInt(behindMatch[1], 10) || 0;

        const isCurrent = statusSummary.current === name;

        if (name.startsWith('origin/') || name === 'origin') {
            remoteBranches.push({
                name,
                type: 'remote',
                isCurrent: false,
                shortHash,
                fullHash,
                message,
                author,
                date
            });
        } else {
            branches.push({
                name,
                type: 'local',
                isCurrent,
                shortHash,
                fullHash,
                message: message || 'No commits yet',
                author,
                date,
                ahead,
                behind
            });
        }
    }

    return {
        branches,
        remoteBranches,
        currentBranch: statusSummary.current,
        status: {
            modified: statusSummary.modified.length,
            staged: statusSummary.staged.length,
            untracked: statusSummary.not_added.length,
            deleted: statusSummary.deleted.length,
            isClean: typeof statusSummary.isClean === 'function' ? statusSummary.isClean() : true
        },
        graphRaw: logRaw.all ? logRaw.all.map(l => ({
            hash: l.hash,
            shortHash: l.hash ? l.hash.substring(0, 7) : '',
            message: l.message,
            author: l.author_name,
            date: l.date,
            refs: l.refs
        })) : []
    };
}

// ─── REST API Endpoints ───────────────────────────────────────────────────────

// GET /api/status — full repository telemetry
app.get('/api/status', async (req, res) => {
    try {
        const data = await getBranchData();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/branches — branch list only
app.get('/api/branches', async (req, res) => {
    try {
        const data = await getBranchData();
        res.json({ success: true, data: data.branches, currentBranch: data.currentBranch });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/log — full commit log for graph
app.get('/api/log', async (req, res) => {
    try {
        const logRaw = await git.raw(['log', '--oneline', '--graph', '--all', '--format=%H|%h|%s|%an|%ar|%D', '--max-count=100']);
        const lines = logRaw.trim().split('\n').map(line => {
            const graphPrefix = line.match(/^([*|\\/ ]+)/)?.[1] || '';
            const rest = line.substring(graphPrefix.length);
            const parts = rest.split('|');
            return {
                graph: graphPrefix,
                hash: parts[0] || '',
                shortHash: parts[1] || '',
                message: parts[2] || '',
                author: parts[3] || '',
                time: parts[4] || '',
                refs: parts[5] || ''
            };
        });
        res.json({ success: true, data: lines });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/commit/:hash — commit details
app.get('/api/commit/:hash', async (req, res) => {
    try {
        const { hash } = req.params;
        const details = await git.show(['--stat', '--format=full', hash]);
        const log = await git.log({ maxCount: 1, from: hash });
        const latest = log.latest;

        res.json({
            success: true,
            data: {
                hash,
                shortHash: hash.substring(0, 7),
                message: latest?.message || '',
                author: latest?.author_name || '',
                email: latest?.author_email || '',
                date: latest?.date || '',
                diff: details
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/switch — switch/checkout branch
app.post('/api/switch', async (req, res) => {
    const { branch } = req.body;
    if (!branch) return res.status(400).json({ success: false, message: 'Branch name required' });

    try {
        await git.checkout(branch);
        await broadcastBranchUpdate(`Switched to branch: ${branch}`);
        res.json({ success: true, message: `Switched to branch '${branch}'` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/create — create new branch
app.post('/api/create', async (req, res) => {
    const { name, from } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Branch name required' });

    try {
        if (from) {
            await git.checkoutBranch(name, from);
        } else {
            await git.checkoutLocalBranch(name);
        }
        await broadcastBranchUpdate(`Created branch: ${name}`);
        res.json({ success: true, message: `Branch '${name}' created and checked out` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/branch/:name — delete branch
app.delete('/api/branch/:name', async (req, res) => {
    const { name } = req.params;
    const { force } = req.query;

    if (name === 'main' || name === 'master') {
        return res.status(403).json({ success: false, message: 'Cannot delete protected branch: ' + name });
    }

    try {
        if (force === 'true') {
            await git.raw(['branch', '-D', name]);
        } else {
            await git.deleteLocalBranch(name);
        }
        await broadcastBranchUpdate(`Deleted branch: ${name}`);
        res.json({ success: true, message: `Branch '${name}' deleted` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/merge — merge source branch into current HEAD
app.post('/api/merge', async (req, res) => {
    const { source } = req.body;
    if (!source) return res.status(400).json({ success: false, message: 'Source branch required' });

    try {
        const mergeResult = await git.merge([source]);
        await broadcastBranchUpdate(`Merged ${source}`);
        res.json({
            success: true,
            message: `Merged '${source}' successfully`,
            data: { result: mergeResult.result, summary: mergeResult.summary }
        });
    } catch (err) {
        if (err.message && err.message.includes('CONFLICTS')) {
            res.status(409).json({
                success: false,
                message: `Merge conflict detected. Resolve conflicts manually.`,
                error: 'MERGE_CONFLICT'
            });
        } else {
            res.status(500).json({ success: false, message: err.message });
        }
    }
});

// POST /api/push — push current branch to origin
app.post('/api/push', async (req, res) => {
    const { branch, setUpstream } = req.body;
    try {
        const status = await git.status();
        const currentBranch = branch || status.current;

        if (setUpstream) {
            await git.raw(['push', '--set-upstream', 'origin', currentBranch]);
        } else {
            await git.push('origin', currentBranch);
        }
        await broadcastBranchUpdate(`Pushed ${currentBranch}`);
        res.json({ success: true, message: `Pushed '${currentBranch}' to origin` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/fetch — fetch from origin
app.post('/api/fetch', async (req, res) => {
    try {
        await git.fetch(['--all', '--prune']);
        await broadcastBranchUpdate('Fetched from origin');
        res.json({ success: true, message: 'Fetched all remotes' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/health
app.get('/api/health', (req, res) => {
    res.json({ success: true, status: 'ok', repo: REPO_PATH, port: PORT });
});

// ─── Start Server ──────────────────────────────────────────────────────────────
server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
    console.log(`🔗 API: http://localhost:${PORT}/api/status`);
    console.log(`\nPress Ctrl+C to stop.\n`);
});
