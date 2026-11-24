import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createOpenCraftServer } from '../apps/server/src/index.mjs';
import {
  createDefaultProject,
  MODEL_CATALOG,
  MANNEQUIN_POSE_PRESETS,
  ALPEMOX_SUITE_APPS,
  DOWNLOADABLE_PACKS,
  FILM_TRANSITIONS,
  FILM_FILTERS,
} from '@opencraft/shared';

test('shared defaults and catalog are valid', () => {
  const proj = createDefaultProject('test-1', 'Test Sahnesi');
  assert.equal(proj.id, 'test-1');
  assert.ok(proj.layers2d.length >= 2);
  assert.ok(Array.isArray(proj.vectors));
  assert.ok(Array.isArray(proj.audioClips));
  assert.ok(Array.isArray(proj.moodboard));
  assert.ok(proj.stageLighting);
  assert.ok(proj.objects3d.some((o) => o.kind === 'mannequin'));
  assert.ok(MODEL_CATALOG.length >= 10);
  assert.ok(MODEL_CATALOG.some((m) => m.provider === 'pollinations'));
  assert.ok(MODEL_CATALOG.some((m) => m.provider === 'a1111'));
  assert.ok(MANNEQUIN_POSE_PRESETS.heroic);
  assert.ok(ALPEMOX_SUITE_APPS.length >= 7);
  assert.ok(DOWNLOADABLE_PACKS.length >= 4);
  assert.ok(FILM_TRANSITIONS.length >= 6);
  assert.ok(FILM_FILTERS.length >= 8);
});

test('server API, WebSocket sync, pipeline run, and MCP stdio integration', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencraft-test-'));
  const { server } = createOpenCraftServer({ dataDir: tmpDir });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Health, Suite & Download endpoints
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.ok, true);

    const suiteRes = await fetch(`${baseUrl}/api/suite`);
    assert.equal(suiteRes.status, 200);
    const suite = await suiteRes.json();
    assert.equal(suite.brand, 'Alpemox');
    assert.ok(suite.apps.some((a) => a.id === 'alpemox-photo'));
    assert.ok(suite.apps.some((a) => a.id === 'alpemox-game'));

    const dlRes = await fetch(`${baseUrl}/api/download/alpemox-photo/macos`);
    assert.equal(dlRes.status, 200);
    const dlText = await dlRes.text();
    assert.ok(dlText.includes('mode=photo'));

    const launcherDlRes = await fetch(`${baseUrl}/api/download/alpemox-suite/macos`);
    assert.equal(launcherDlRes.status, 200);
    const launcherDlText = await launcherDlRes.text();
    assert.ok(launcherDlText.includes('page=launcher'));

    for (const pack of DOWNLOADABLE_PACKS) {
      const pRes = await fetch(`${baseUrl}/api/packs/${pack.id}`);
      assert.equal(pRes.status, 200);
      const buf = Buffer.from(await pRes.arrayBuffer());
      assert.equal(buf[0], 0x50); // 'P'
      assert.equal(buf[1], 0x4b); // 'K' (valid ZIP)
    }

    // 2. Connect WebSocket client to verify live agent broadcast
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const wsEvents = [];
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });
    ws.on('message', (buf) => {
      wsEvents.push(JSON.parse(buf.toString('utf8')));
    });

    // 3. Cloud Waitlist + Open Suite 2x batch variations
    const badWaitlist = await fetch(`${baseUrl}/api/cloud/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    assert.equal(badWaitlist.status, 400);

    const joinWaitlist = await fetch(`${baseUrl}/api/cloud/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'creator@alpemox.dev', role: 'Video Editörü' }),
    });
    assert.equal(joinWaitlist.status, 201);
    const joinData = await joinWaitlist.json();
    assert.equal(joinData.ok, true);
    assert.equal(joinData.count, 1);

    const dupWaitlist = await fetch(`${baseUrl}/api/cloud/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'creator@alpemox.dev' }),
    });
    assert.equal(dupWaitlist.status, 200);
    assert.equal((await dupWaitlist.json()).alreadyJoined, true);

    // 3a. Roadmap & Feature Request endpoints
    assert.ok(Array.isArray(suite.roadmap) && suite.roadmap.length >= 6);
    const reqListRes = await fetch(`${baseUrl}/api/requests`);
    assert.equal(reqListRes.status, 200);
    const reqList = await reqListRes.json();
    assert.ok(reqList.items.length >= 2);

    const createReq = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'Animasyon & Rigging',
        title: 'AI Dudak Senkronu (Lip-Sync)',
        description: 'Ses dosyasından karakter ağzı otomatik animasyonu',
      }),
    });
    assert.equal(createReq.status, 201);
    const createdReq = await createReq.json();
    assert.equal(createdReq.ok, true);

    const voteRes = await fetch(`${baseUrl}/api/requests/${createdReq.request.id}/vote`, { method: 'POST' });
    assert.equal(voteRes.status, 200);
    assert.equal((await voteRes.json()).request.votes, 2);

    // 3b. Open Suite allows 2x batch variations without locks
    const craftRes = await fetch(`${baseUrl}/api/craft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'default',
        workflow: 'stage-to-image',
        provider: 'procedural',
        modelId: 'procedural-studio-preview',
        prompt: 'Cyberpunk rooftop samurai',
        width: 512,
        height: 512,
        steps: 10,
        cfgScale: 7,
        seed: 42,
        denoise: 0.7,
        batchCount: 2,
      }),
    });
    assert.equal(craftRes.status, 200);
    const craftData = await craftRes.json();
    assert.equal(craftData.ok, true);
    assert.equal(craftData.output.seed, 42);
    assert.equal(craftData.output.variations.length, 2);
    assert.ok(craftData.output.imageUrl.startsWith('data:image/svg+xml;base64,'));

    // 4. Pipeline execution adds output layer
    const pipeRes = await fetch(`${baseUrl}/api/pipeline/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'default',
        promptOverride: 'Neon studio portrait',
        providerOverride: 'procedural',
        modelOverride: 'procedural-studio-preview',
      }),
    });
    assert.equal(pipeRes.status, 200);
    const pipeData = await pipeRes.json();
    assert.equal(pipeData.ok, true);
    assert.ok(pipeData.project.layers2d.some((l) => l.name.includes('Pipeline Çıktısı')));

    // 5. Real MCP client over stdio driving the live server
    const transport = new StdioClientTransport({
      command: 'node',
      args: [path.resolve(process.cwd(), 'packages/mcp/bin/opencraft-mcp.mjs')],
      env: { ...process.env, OPENCRAFT_SERVER_URL: baseUrl },
    });
    const mcpClient = new Client({ name: 'test-client', version: '0.1.0' });
    await mcpClient.connect(transport);

    const tools = await mcpClient.listTools();
    const toolNames = tools.tools.map((t) => t.name);
    assert.ok(toolNames.includes('set_mannequin_pose'));
    assert.ok(toolNames.includes('add_3d_object'));
    assert.ok(toolNames.includes('run_craft'));

    const poseRes = await mcpClient.callTool({
      name: 'set_mannequin_pose',
      arguments: { projectId: 'default', objectId: 'mannequin-1', preset: 'action' },
    });
    assert.ok(poseRes.content[0].text.includes("pose 'action'"));

    const add3dRes = await mcpClient.callTool({
      name: 'add_3d_object',
      arguments: { projectId: 'default', name: 'MCP Drone', kind: 'sphere', x: 1.2, y: 2.0, z: 0.5 },
    });
    assert.ok(add3dRes.content[0].text.includes('3D object added'));

    await mcpClient.close();

    // Give WS a brief moment to receive broadcasts
    await new Promise((r) => setTimeout(r, 120));
    ws.close();

    assert.ok(wsEvents.some((e) => e.type === 'project:updated' && e.action === 'set_mannequin_pose'));
    assert.ok(wsEvents.some((e) => e.type === 'project:updated' && e.action === 'add_3d_object'));
    assert.ok(wsEvents.some((e) => e.type === 'craft:completed'));

    // Verify final state persisted on disk
    const finalRes = await fetch(`${baseUrl}/api/projects/default`);
    const { project: finalProj } = await finalRes.json();
    const mannequin = finalProj.objects3d.find((o) => o.id === 'mannequin-1');
    assert.equal(mannequin.pose.preset, 'action');
    assert.ok(finalProj.objects3d.some((o) => o.name === 'MCP Drone'));

    // 7. Game AI endpoint (built-in & custom/ollama fallback)
    const gameAiRes = await fetch(`${baseUrl}/api/game/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'npc-chat',
        provider: 'builtin',
        prompt: 'Altınlar nerede?',
        gameState: { score: 100, coins: 1, totalCoins: 3, hp: 3 },
      }),
    });
    assert.equal(gameAiRes.status, 200);
    const gameAiData = await gameAiRes.json();
    assert.equal(gameAiData.ok, true);
    assert.ok(gameAiData.reply.includes('1/3'));
  } finally {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
