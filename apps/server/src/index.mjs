import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import {
  MODEL_CATALOG,
  MANNEQUIN_POSE_PRESETS,
  ALPEMOX_SUITE_APPS,
  DOWNLOADABLE_PACKS,
  ROADMAP_UPCOMING_FEATURES,
} from '@opencraft/shared';
import { ProjectStore } from './store.mjs';
import { ProviderHub } from './providers.mjs';
import { buildDownloadablePackBuffer } from './packs.mjs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

export function createOpenCraftServer(options = {}) {
  const dataDir = options.dataDir || process.env.OPENCRAFT_DATA_DIR || path.join(repoRoot, 'data');
  const store = new ProjectStore(dataDir);
  const providers = new ProviderHub(process.env);
  const licensePath = path.join(dataDir, 'license.json');

  const getLicenseStatus = () => {
    try {
      if (fs.existsSync(licensePath)) {
        const raw = JSON.parse(fs.readFileSync(licensePath, 'utf8'));
        if (raw?.plan === 'pro') {
          return {
            plan: 'pro',
            cloudStatus: 'active',
            licenseKeyMasked: raw.licenseKeyMasked || 'ALPEMOX-PRO-****',
            maxVideoHeight: 2160,
            maxImageSide: 4096,
          };
        }
      }
    } catch {
      // ignore corrupt file
    }
    return { plan: 'free', cloudStatus: 'coming-soon', maxVideoHeight: 2160, maxImageSide: 4096 };
  };

  const waitlistPath = path.join(dataDir, 'waitlist.json');
  const readWaitlist = () => {
    try {
      if (fs.existsSync(waitlistPath)) {
        const arr = JSON.parse(fs.readFileSync(waitlistPath, 'utf8'));
        return Array.isArray(arr) ? arr : [];
      }
    } catch {
      // ignore
    }
    return [];
  };

  const featureRequestsPath = path.join(dataDir, 'feature-requests.json');
  const readFeatureRequests = () => {
    try {
      if (fs.existsSync(featureRequestsPath)) {
        const arr = JSON.parse(fs.readFileSync(featureRequestsPath, 'utf8'));
        return Array.isArray(arr) ? arr : [];
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'req-seed-anim',
        category: 'Animasyon & Rigging',
        title: '2D Kemik Rigging & Lottie JSON Dışa Aktarımı',
        description: 'Vector ve Photo katmanlarına eklem kemikleri bağlayıp anahtar karelerle canlandırma.',
        email: null,
        votes: 14,
        createdAt: '2026-11-20T12:00:00.000Z',
      },
      {
        id: 'req-seed-video',
        category: 'Video & Motion',
        title: 'Video Hareket Takibi (Motion Tracking) & Speed Ramp',
        description: 'Klip içinde belirli nesneye yazı/efekt sabitleme ve yumuşak hız eğrileri.',
        email: null,
        votes: 11,
        createdAt: '2026-11-21T09:00:00.000Z',
      },
    ];
  };

  const saveFeatureRequests = (list) => {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(featureRequestsPath, JSON.stringify(list, null, 2), 'utf8');
  };

  const saveLicenseStatus = (next) => {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(licensePath, JSON.stringify(next, null, 2), 'utf8');
    return next;
  };

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  const broadcast = (event) => {
    const msg = JSON.stringify(event);
    for (const client of wss.clients) {
      if (client.readyState === 1) {
        client.send(msg);
      }
    }
  };

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'connected', server: 'opencraft', version: '0.1.0' }));
  });

  app.get('/api/cloud/waitlist', (_req, res) => {
    const list = readWaitlist();
    res.json({ count: list.length });
  });

  app.post('/api/cloud/waitlist', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const role = String(req.body?.role || 'Creator').trim().slice(0, 64);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'Lütfen geçerli bir e-posta adresi girin.' });
    }
    const list = readWaitlist();
    const exists = list.some((entry) => entry.email === email);
    if (!exists) {
      fs.mkdirSync(dataDir, { recursive: true });
      list.push({ email, role, createdAt: new Date().toISOString() });
      fs.writeFileSync(waitlistPath, JSON.stringify(list, null, 2), 'utf8');
    }
    return res.status(exists ? 200 : 201).json({
      ok: true,
      alreadyJoined: exists,
      count: list.length,
    });
  });

  app.get('/api/license/status', (_req, res) => {
    res.json(getLicenseStatus());
  });

  app.post('/api/license/activate', (req, res) => {
    const { key, plan } = req.body || {};
    if (plan === 'free') {
      const next = saveLicenseStatus({ plan: 'free', maxVideoHeight: 720, maxImageSide: 720 });
      broadcast({ type: 'license:updated', license: next });
      return res.json({ ok: true, license: next });
    }

    const cleanKey = String(key || '').trim().toUpperCase();
    if (!/^ALPEMOX-PRO-[A-Z0-9-]{4,}$/.test(cleanKey)) {
      return res.status(400).json({
        ok: false,
        error: 'Geçersiz lisans anahtarı. Örnek format: ALPEMOX-PRO-2026',
      });
    }

    const masked = `${cleanKey.slice(0, 12)}****${cleanKey.slice(-2)}`;
    const next = saveLicenseStatus({
      plan: 'pro',
      licenseKeyMasked: masked,
      maxVideoHeight: 2160,
      maxImageSide: 4096,
    });
    broadcast({ type: 'license:updated', license: next });
    return res.json({ ok: true, license: next });
  });

  app.get('/api/health', async (_req, res) => {
    const [comfy, a1111, ollama] = await Promise.all([
      providers.discoverComfyUIModels(),
      providers.discoverA1111(),
      providers.discoverOllama(),
    ]);
    res.json({
      ok: true,
      service: 'alpemox-server',
      comfyui: comfy,
      a1111,
      ollama,
      providers: providers.getPublicStatus(),
    });
  });

  app.get('/api/requests', (_req, res) => {
    const items = readFeatureRequests();
    res.json({ count: items.length, items });
  });

  app.post('/api/requests', (req, res) => {
    const title = String(req.body?.title || '').trim().slice(0, 120);
    const description = String(req.body?.description || '').trim().slice(0, 600);
    const category = String(req.body?.category || 'Video & Motion').trim().slice(0, 64);
    const emailRaw = String(req.body?.email || '').trim().toLowerCase();
    if (title.length < 3) {
      return res.status(400).json({ ok: false, error: 'Lütfen en az 3 karakterlik bir özellik başlığı girin.' });
    }
    const items = readFeatureRequests();
    const entry = {
      id: `req-${Date.now().toString(36)}`,
      category,
      title,
      description: description || 'Topluluk önerisi olarak iletildi.',
      email: emailRaw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw : null,
      votes: 1,
      createdAt: new Date().toISOString(),
    };
    const next = [entry, ...items].slice(0, 50);
    saveFeatureRequests(next);
    return res.status(201).json({ ok: true, request: entry, count: next.length, items: next });
  });

  app.post('/api/requests/:id/vote', (req, res) => {
    const items = readFeatureRequests();
    const idx = items.findIndex((r) => r.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ ok: false, error: 'İstek bulunamadı.' });
    }
    items[idx] = { ...items[idx], votes: Number(items[idx].votes || 0) + 1 };
    saveFeatureRequests(items);
    return res.json({ ok: true, request: items[idx], items });
  });

  app.get('/api/suite', (_req, res) => {
    res.json({
      brand: 'Alpemox',
      version: '0.3.0',
      license: 'AGPL-3.0-only',
      apps: ALPEMOX_SUITE_APPS,
      packs: DOWNLOADABLE_PACKS,
      roadmap: ROADMAP_UPCOMING_FEATURES,
    });
  });

  app.get('/api/packs', (_req, res) => {
    res.json({ packs: DOWNLOADABLE_PACKS });
  });

  app.get('/api/packs/:packId', async (req, res) => {
    try {
      const buf = await buildDownloadablePackBuffer(req.params.packId);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${req.params.packId}-pack.zip"`);
      res.send(buf);
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  });

  app.get('/api/download/:appId/:platform', (req, res) => {
    const { appId, platform } = req.params;
    const isSuite = appId === 'alpemox-suite' || appId === 'alpemox-launcher';
    const appInfo = ALPEMOX_SUITE_APPS.find((a) => a.id === appId) || {
      id: 'alpemox-launcher',
      name: 'Alpemox Suite Launcher',
      mode: 'hybrid',
    };
    const safePlatform = String(platform || 'macos').toLowerCase();
    const targetQuery = isSuite ? '?page=launcher' : `?page=studio&mode=${appInfo.mode}`;
    const targetUrl = `http://127.0.0.1:4310/${targetQuery}`;

    if (safePlatform === 'windows') {
      const ps1 = `# Alpemox Launcher (${appInfo.name} - Windows)
$ErrorActionPreference = "SilentlyContinue"
$url = "${targetUrl}"
Write-Host "Alpemox baslatiliyor: ${appInfo.name}" -ForegroundColor Cyan
try {
  Invoke-WebRequest -Uri "http://127.0.0.1:4310/api/health" -TimeoutSec 2 | Out-Null
} catch {
  if (Test-Path "$PSScriptRoot\\apps\\server\\src\\index.mjs") {
    Start-Process -FilePath "node" -ArgumentList "$PSScriptRoot\\apps\\server\\src\\index.mjs" -WindowStyle Hidden
    Start-Sleep -Seconds 2
  }
}
Start-Process $url
`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${appInfo.id}-windows-launcher.ps1"`);
      return res.send(ps1);
    }

    const ext = safePlatform === 'macos' ? 'command' : 'sh';
    const sh = `#!/usr/bin/env bash
# Alpemox Launcher (${appInfo.name} - ${safePlatform})
set -e
URL="${targetUrl}"
echo "Alpemox baslatiliyor: ${appInfo.name}"

if ! curl -sf "http://127.0.0.1:4310/api/health" >/dev/null 2>&1; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  if [ -f "$SCRIPT_DIR/apps/server/src/index.mjs" ]; then
    nohup node "$SCRIPT_DIR/apps/server/src/index.mjs" >/tmp/alpemox-server.log 2>&1 &
    sleep 2
  elif [ -f "$HOME/alpemox/apps/server/src/index.mjs" ]; then
    nohup node "$HOME/alpemox/apps/server/src/index.mjs" >/tmp/alpemox-server.log 2>&1 &
    sleep 2
  elif [ -f "$HOME/opencraft/apps/server/src/index.mjs" ]; then
    nohup node "$HOME/opencraft/apps/server/src/index.mjs" >/tmp/alpemox-server.log 2>&1 &
    sleep 2
  fi
fi

if command -v open >/dev/null 2>&1; then
  open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"
else
  echo "Tarayicida acin: $URL"
fi
`;
    res.setHeader('Content-Type', 'text/x-shellscript; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${appInfo.id}-${safePlatform}-launcher.${ext}"`);
    return res.send(sh);
  });

  app.get('/api/models', async (_req, res) => {
    const comfy = await providers.discoverComfyUIModels();
    res.json({
      models: MODEL_CATALOG,
      posePresets: Object.keys(MANNEQUIN_POSE_PRESETS),
      comfyui: comfy,
    });
  });

  app.get('/api/providers/status', (_req, res) => {
    res.json(providers.getPublicStatus());
  });

  app.post('/api/providers/config', (req, res) => {
    const status = providers.updateConfig(req.body || {});
    broadcast({ type: 'providers:updated', status });
    res.json(status);
  });

  app.get('/api/projects', (_req, res) => {
    res.json({ projects: store.listProjects() });
  });

  app.post('/api/projects', (req, res) => {
    const { id, name } = req.body || {};
    const project = store.createProject(id, name);
    broadcast({ type: 'project:created', project });
    res.status(201).json({ project });
  });

  app.get('/api/projects/:id', (req, res) => {
    const project = store.getProject(req.params.id);
    res.json({ project });
  });

  app.put('/api/projects/:id', (req, res) => {
    const incoming = req.body?.project || req.body;
    if (!incoming || typeof incoming !== 'object') {
      return res.status(400).json({ error: 'Geçersiz proje verisi.' });
    }
    const saved = store.saveProject({ ...incoming, id: req.params.id });
    broadcast({ type: 'project:updated', project: saved, source: req.body?.source || 'studio' });
    res.json({ project: saved });
  });

  app.post('/api/projects/:id/command', (req, res) => {
    try {
      const saved = store.applyCommand(req.params.id, req.body);
      broadcast({
        type: 'project:updated',
        project: saved,
        source: req.body?.source || 'agent',
        action: req.body?.action,
      });
      res.json({ ok: true, project: saved });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/craft', async (req, res) => {
    try {
      const payload = req.body || {};
      const projectId = payload.projectId || 'default';
      const output = await providers.craft(payload);

      const project = store.getProject(projectId);
      project.craftHistory = [output, ...(project.craftHistory || [])].slice(0, 30);
      const saved = store.saveProject(project);

      broadcast({ type: 'craft:completed', output, project: saved });
      res.json({ ok: true, output, project: saved });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/pipeline/run', async (req, res) => {
    try {
      const projectId = req.body?.projectId || 'default';
      const project = store.getProject(projectId);
      const promptNode = project.pipelineNodes.find((n) => n.type === 'prompt');
      const modelNode = project.pipelineNodes.find((n) => n.type === 'model');
      const loraNode = project.pipelineNodes.find((n) => n.type === 'lora');
      const upscaleNode = project.pipelineNodes.find((n) => n.type === 'upscale');
      const outputNode = project.pipelineNodes.find((n) => n.type === 'output');

      const promptText = String(req.body?.promptOverride || promptNode?.config?.prompt || 'Cinematic scene');
      const provider = String(req.body?.providerOverride || modelNode?.config?.provider || 'pollinations');
      const modelId = String(req.body?.modelOverride || modelNode?.config?.modelId || 'pollinations-flux');
      const scaleMult = upscaleNode ? Number(upscaleNode.config?.factor || 1.25) : 1;
      const baseW = req.body?.width || project.canvasWidth || 1024;
      const baseH = req.body?.height || project.canvasHeight || 1024;

      const output = await providers.craft({
        projectId,
        workflow: req.body?.stageRgbDataUrl ? 'stage-to-image' : 'text-to-image',
        provider,
        modelId,
        prompt: promptText,
        width: Math.min(1536, Math.round(baseW * scaleMult)),
        height: Math.min(1536, Math.round(baseH * scaleMult)),
        steps: 20,
        cfgScale: 7,
        seed: Math.floor(Math.random() * 1_000_000_000),
        denoise: 0.72,
        batchCount: Number(modelNode?.config?.batchCount || 1),
        loraName: loraNode?.config?.loraName ? String(loraNode.config.loraName) : undefined,
        loraStrength: loraNode?.config?.strength ? Number(loraNode.config.strength) : undefined,
        stageRgbDataUrl: req.body?.stageRgbDataUrl,
        stageDepthDataUrl: req.body?.stageDepthDataUrl,
        canvasDataUrl: req.body?.canvasDataUrl,
      });

      project.craftHistory = [output, ...(project.craftHistory || [])].slice(0, 30);
      if (outputNode?.config?.autoAddLayer && output.imageUrl) {
        project.layers2d.push({
          id: `layer-${output.id}`,
          name: `Pipeline Çıktısı (${output.provider})`,
          kind: 'raster',
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'normal',
          x: 0,
          y: 0,
          width: project.canvasWidth,
          height: project.canvasHeight,
          rotation: 0,
          dataUrl: output.imageUrl,
        });
      }

      const saved = store.saveProject(project);
      broadcast({ type: 'craft:completed', output, project: saved });
      res.json({ ok: true, output, project: saved });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/game/ai', async (req, res) => {
    try {
      const result = await providers.runGameAi(req.body || {});
      res.json(result);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/projects/:id/game-control', (req, res) => {
    const command = String(req.body?.command || '').trim();
    const payload = req.body?.payload || {};
    if (!command) {
      return res.status(400).json({ ok: false, error: 'command required' });
    }
    broadcast({
      type: 'game:control',
      projectId: req.params.id,
      command,
      payload,
      source: req.body?.source || 'mcp',
    });
    return res.json({ ok: true, projectId: req.params.id, command, payload });
  });

  app.get('/api/mcp/config', (req, res) => {
    const mcpEntryPath = path.join(repoRoot, 'packages/mcp/bin/opencraft-mcp.mjs');
    const hostHeader = req.get('host') || '127.0.0.1:4310';
    const serverUrl = `${req.protocol}://${hostHeader}`;
    res.json({
      serverName: 'alpemox',
      mcpEntryPath,
      serverUrl,
      claudeCliCommand: `claude mcp add alpemox -e OPENCRAFT_SERVER_URL=${serverUrl} -- node "${mcpEntryPath}"`,
      mcpJsonConfig: {
        mcpServers: {
          alpemox: {
            command: 'node',
            args: [mcpEntryPath],
            env: {
              OPENCRAFT_SERVER_URL: serverUrl,
            },
          },
        },
      },
    });
  });

  // Serve built frontend if available
  const studioDist = path.join(repoRoot, 'apps/studio/dist');
  if (fs.existsSync(studioDist)) {
    app.use(express.static(studioDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next();
      res.sendFile(path.join(studioDist, 'index.html'));
    });
  }

  return { app, server, wss, store, providers };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.PORT || 4310);
  const { server } = createOpenCraftServer();
  server.listen(port, () => {
    console.log(`[opencraft-server] http://localhost:${port} (WS: /ws)`);
  });
}
