#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE_URL = (process.env.OPENCRAFT_SERVER_URL || 'http://127.0.0.1:4310').replace(/\/$/, '');

async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `OpenCraft server error (${res.status})`);
  }
  return data;
}

const GAME_ROLE_ENUM = z.enum([
  'player',
  'solid',
  'moving',
  'bounce',
  'powerup',
  'collectible',
  'hazard',
  'checkpoint',
  'goal',
  'npc',
  'decor',
]);

const GAME_ENTITY_SCHEMA = z.object({
  name: z.string(),
  kind: z.enum(['mannequin', 'box', 'sphere', 'cylinder', 'cone', 'torus']).default('box'),
  gameRole: GAME_ROLE_ENUM.default('solid'),
  x: z.number().default(0),
  y: z.number().default(0.5),
  z: z.number().default(0),
  sx: z.number().default(1),
  sy: z.number().default(1),
  sz: z.number().default(1),
  color: z.string().default('#38bdf8'),
  moveSpeed: z.number().optional(),
  jumpForce: z.number().optional(),
  patrolRange: z.number().optional(),
  patrolAxis: z.enum(['x', 'y', 'z']).optional(),
  bounceForce: z.number().optional(),
  npcBehavior: z.enum(['patrol', 'chase', 'turret', 'companion']).optional(),
  powerupType: z.enum(['shield', 'magnet', 'speed']).optional(),
  aiPersona: z.string().optional(),
});

export function createOpenCraftMcpServer() {
  const server = new McpServer({
    name: 'alpemox-mcp',
    version: '0.3.0',
  });

  server.registerTool(
    'get_project_state',
    {
      description: 'Read current 2D layers, 3D stage objects, camera, pipeline, and storyboard of an OpenCraft project.',
      inputSchema: {
        projectId: z.string().default('default'),
      },
    },
    async ({ projectId }) => {
      const data = await api(`/api/projects/${encodeURIComponent(projectId)}`);
      return { content: [{ type: 'text', text: JSON.stringify(data.project, null, 2) }] };
    },
  );

  server.registerTool(
    'list_models',
    {
      description: 'List available AI models, pose presets, and ComfyUI discovery status.',
      inputSchema: {},
    },
    async () => {
      const data = await api('/api/models');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    'add_2d_layer',
    {
      description: 'Add a 2D shape or text layer to the live OpenCraft canvas.',
      inputSchema: {
        projectId: z.string().default('default'),
        name: z.string(),
        kind: z.enum(['shape', 'text', 'raster']).default('shape'),
        x: z.number().default(120),
        y: z.number().default(120),
        width: z.number().default(300),
        height: z.number().default(200),
        fillColor: z.string().default('#38bdf8'),
        textContent: z.string().optional(),
      },
    },
    async ({ projectId, ...payload }) => {
      const data = await api(`/api/projects/${encodeURIComponent(projectId)}/command`, {
        method: 'POST',
        body: JSON.stringify({ action: 'add_2d_layer', source: 'mcp', payload }),
      });
      return { content: [{ type: 'text', text: `Layer added. Total 2D layers: ${data.project.layers2d.length}` }] };
    },
  );

  server.registerTool(
    'add_3d_object',
    {
      description: 'Add a 3D primitive, backdrop, or articulated mannequin to the 3D stage.',
      inputSchema: {
        projectId: z.string().default('default'),
        name: z.string(),
        kind: z.enum(['mannequin', 'box', 'sphere', 'cylinder', 'backdrop']).default('box'),
        x: z.number().default(0),
        y: z.number().default(0.6),
        z: z.number().default(0),
        color: z.string().default('#38bdf8'),
        posePreset: z.enum(['neutral', 'heroic', 'action', 'sitting', 'walking']).optional(),
      },
    },
    async ({ projectId, x, y, z: zPos, ...rest }) => {
      const data = await api(`/api/projects/${encodeURIComponent(projectId)}/command`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'add_3d_object',
          source: 'mcp',
          payload: { ...rest, position: { x, y, z: zPos } },
        }),
      });
      return { content: [{ type: 'text', text: `3D object added. Total 3D objects: ${data.project.objects3d.length}` }] };
    },
  );

  server.registerTool(
    'set_mannequin_pose',
    {
      description: 'Set a 3D humanoid mannequin pose preset (neutral, heroic, action, sitting, walking).',
      inputSchema: {
        projectId: z.string().default('default'),
        objectId: z.string().default('mannequin-1'),
        preset: z.enum(['neutral', 'heroic', 'action', 'sitting', 'walking']),
      },
    },
    async ({ projectId, objectId, preset }) => {
      const data = await api(`/api/projects/${encodeURIComponent(projectId)}/command`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'set_mannequin_pose',
          source: 'mcp',
          payload: { id: objectId, preset },
        }),
      });
      return { content: [{ type: 'text', text: `Mannequin ${objectId} updated to pose '${preset}'.` }] };
    },
  );

  server.registerTool(
    'set_camera',
    {
      description: 'Move the 3D stage camera position, target, and FOV.',
      inputSchema: {
        projectId: z.string().default('default'),
        px: z.number(),
        py: z.number(),
        pz: z.number(),
        tx: z.number().default(0),
        ty: z.number().default(1),
        tz: z.number().default(0),
        fov: z.number().default(42),
      },
    },
    async ({ projectId, px, py, pz, tx, ty, tz, fov }) => {
      await api(`/api/projects/${encodeURIComponent(projectId)}/command`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'set_camera',
          source: 'mcp',
          payload: {
            position: { x: px, y: py, z: pz },
            target: { x: tx, y: ty, z: tz },
            fov,
          },
        }),
      });
      return { content: [{ type: 'text', text: `Camera updated to (${px}, ${py}, ${pz}) FOV ${fov}.` }] };
    },
  );

  server.registerTool(
    'run_craft',
    {
      description: 'Execute an AI generation or prompt enhancement job in OpenCraft.',
      inputSchema: {
        projectId: z.string().default('default'),
        prompt: z.string(),
        workflow: z.enum(['text-to-image', 'stage-to-image', 'inpaint', 'prompt-enhance']).default('text-to-image'),
        provider: z.enum(['procedural', 'comfyui', 'openai', 'gemini', 'fal', 'ollama']).default('procedural'),
        modelId: z.string().default('procedural-studio-preview'),
        width: z.number().default(1024),
        height: z.number().default(1024),
      },
    },
    async (args) => {
      const data = await api('/api/craft', {
        method: 'POST',
        body: JSON.stringify({ ...args, steps: 20, cfgScale: 7, seed: 0, denoise: 0.72 }),
      });
      const summary = { ...data.output, imageUrl: data.output.imageUrl ? `[data-url ${data.output.imageUrl.length} chars]` : undefined };
      return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
    },
  );

  server.registerTool(
    'add_storyboard_shot',
    {
      description: 'Append a new shot to the project storyboard timeline.',
      inputSchema: {
        projectId: z.string().default('default'),
        title: z.string(),
        prompt: z.string(),
        durationSec: z.number().default(3),
        cameraNote: z.string().default(''),
      },
    },
    async ({ projectId, ...payload }) => {
      const data = await api(`/api/projects/${encodeURIComponent(projectId)}/command`, {
        method: 'POST',
        body: JSON.stringify({ action: 'add_storyboard_shot', source: 'mcp', payload }),
      });
      return { content: [{ type: 'text', text: `Shot added. Total shots: ${data.project.storyboard.length}` }] };
    },
  );

  // =========================================================================
  // ALPEMOX GAME ENGINE MCP TOOLS (Claude / Cursor / Gemini Control)
  // =========================================================================

  server.registerTool(
    'game_get_scene',
    {
      description:
        'Inspect all 3D entities currently in the Alpemox Game Engine scene (roles, positions, scales, NPC AI behaviors).',
      inputSchema: {
        projectId: z.string().default('default'),
      },
    },
    async ({ projectId }) => {
      const data = await api(`/api/projects/${encodeURIComponent(projectId)}`);
      const entities = (data.project?.objects3d || []).map((o) => ({
        id: o.id,
        name: o.name,
        kind: o.kind,
        gameRole: o.gameRole || 'solid',
        npcBehavior: o.npcBehavior,
        position: o.position,
        scale: o.scale,
        color: o.color,
      }));
      return {
        content: [{ type: 'text', text: JSON.stringify({ count: entities.length, entities }, null, 2) }],
      };
    },
  );

  server.registerTool(
    'game_build_level',
    {
      description:
        'Build a complete playable 3D game in Alpemox Game Engine in one call! Supports player, solid platforms, moving platforms, bounce pads, shield/magnet powerups, coins, checkpoints, hazards, enemy bots (patrol/chase/turret), friendly AI companion, and victory goal portal.',
      inputSchema: {
        projectId: z.string().default('default'),
        clearExisting: z.boolean().default(true),
        skyTheme: z.enum(['cyber', 'sunset', 'neon', 'sky']).optional(),
        cameraMode: z.enum(['tps', 'topdown', 'fps']).optional(),
        gravity: z.number().min(8).max(40).optional(),
        doubleJump: z.boolean().optional(),
        dashEnabled: z.boolean().optional(),
        shooterEnabled: z.boolean().optional(),
        requireAllCoins: z.boolean().optional(),
        autoPlaytest: z.boolean().default(false),
        entities: z.array(GAME_ENTITY_SCHEMA).min(1),
      },
    },
    async ({
      projectId,
      clearExisting,
      skyTheme,
      cameraMode,
      gravity,
      doubleJump,
      dashEnabled,
      shooterEnabled,
      requireAllCoins,
      autoPlaytest,
      entities,
    }) => {
      const objects3d = entities.map((e, idx) => ({
        id: `mcp_gm_${Date.now().toString(36)}_${idx}`,
        name: e.name,
        kind: e.kind,
        visible: true,
        position: { x: e.x, y: e.y, z: e.z },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: e.sx, y: e.sy, z: e.sz },
        color: e.color,
        gameRole: e.gameRole,
        moveSpeed: e.moveSpeed,
        jumpForce: e.jumpForce,
        patrolRange: e.patrolRange,
        patrolAxis: e.patrolAxis,
        bounceForce: e.bounceForce,
        npcBehavior: e.npcBehavior,
        powerupType: e.powerupType,
        aiPersona: e.aiPersona,
      }));

      let saved;
      if (clearExisting) {
        saved = await api(`/api/projects/${encodeURIComponent(projectId)}/command`, {
          method: 'POST',
          body: JSON.stringify({
            action: 'replace_3d_objects',
            source: 'mcp',
            payload: { objects3d },
          }),
        });
      } else {
        for (const obj of objects3d) {
          saved = await api(`/api/projects/${encodeURIComponent(projectId)}/command`, {
            method: 'POST',
            body: JSON.stringify({ action: 'add_3d_object', source: 'mcp', payload: obj }),
          });
        }
      }

      if (skyTheme || cameraMode || gravity !== undefined || doubleJump !== undefined || dashEnabled !== undefined || shooterEnabled !== undefined || requireAllCoins !== undefined) {
        await api(`/api/projects/${encodeURIComponent(projectId)}/game-control`, {
          method: 'POST',
          body: JSON.stringify({
            command: 'set_settings',
            source: 'mcp',
            payload: { skyTheme, cameraMode, gravity, doubleJump, dashEnabled, shooterEnabled, requireAllCoins },
          }),
        });
      }

      if (autoPlaytest) {
        await api(`/api/projects/${encodeURIComponent(projectId)}/game-control`, {
          method: 'POST',
          body: JSON.stringify({ command: 'start_playtest', source: 'mcp', payload: {} }),
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: `Game level built in Alpemox! Total 3D entities: ${saved?.project?.objects3d?.length ?? objects3d.length}.${autoPlaytest ? ' Live Playtest started!' : ''}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'game_spawn_entity',
    {
      description:
        'Spawn a single 3D game entity (player, platform, moving bridge, bounce pad, powerup, coin, checkpoint, hazard, enemy bot, companion, or goal portal).',
      inputSchema: {
        projectId: z.string().default('default'),
        entity: GAME_ENTITY_SCHEMA,
      },
    },
    async ({ projectId, entity }) => {
      const payload = {
        name: entity.name,
        kind: entity.kind,
        position: { x: entity.x, y: entity.y, z: entity.z },
        scale: { x: entity.sx, y: entity.sy, z: entity.sz },
        color: entity.color,
        gameRole: entity.gameRole,
        moveSpeed: entity.moveSpeed,
        jumpForce: entity.jumpForce,
        patrolRange: entity.patrolRange,
        patrolAxis: entity.patrolAxis,
        bounceForce: entity.bounceForce,
        npcBehavior: entity.npcBehavior,
        powerupType: entity.powerupType,
        aiPersona: entity.aiPersona,
      };
      const data = await api(`/api/projects/${encodeURIComponent(projectId)}/command`, {
        method: 'POST',
        body: JSON.stringify({ action: 'add_3d_object', source: 'mcp', payload }),
      });
      return {
        content: [
          {
            type: 'text',
            text: `Spawned '${entity.name}' (${entity.gameRole}) at (${entity.x}, ${entity.y}, ${entity.z}). Total entities: ${data.project.objects3d.length}.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'game_update_entity',
    {
      description: 'Update position, scale, color, role, speed, or AI behavior of an existing game entity.',
      inputSchema: {
        projectId: z.string().default('default'),
        id: z.string(),
        name: z.string().optional(),
        gameRole: GAME_ROLE_ENUM.optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        z: z.number().optional(),
        color: z.string().optional(),
        moveSpeed: z.number().optional(),
        npcBehavior: z.enum(['patrol', 'chase', 'turret', 'companion']).optional(),
      },
    },
    async ({ projectId, id, x, y, z: zPos, ...rest }) => {
      const state = await api(`/api/projects/${encodeURIComponent(projectId)}`);
      const existing = state.project?.objects3d?.find((o) => o.id === id);
      if (!existing) throw new Error(`Entity not found: ${id}`);
      const patch = { ...rest };
      if (x !== undefined || y !== undefined || zPos !== undefined) {
        patch.position = {
          x: x ?? existing.position.x,
          y: y ?? existing.position.y,
          z: zPos ?? existing.position.z,
        };
      }
      await api(`/api/projects/${encodeURIComponent(projectId)}/command`, {
        method: 'POST',
        body: JSON.stringify({ action: 'update_3d_object', source: 'mcp', payload: { id, patch } }),
      });
      return { content: [{ type: 'text', text: `Updated game entity '${id}'.` }] };
    },
  );

  server.registerTool(
    'game_control',
    {
      description:
        'Control the live Alpemox Game Engine runtime over WebSocket: start/stop/reset playtest, change camera/sky/rules, or display a live message from Claude inside the game!',
      inputSchema: {
        projectId: z.string().default('default'),
        command: z.enum([
          'start_playtest',
          'stop_playtest',
          'reset_game',
          'set_settings',
          'companion_say',
        ]),
        cameraMode: z.enum(['tps', 'topdown', 'fps']).optional(),
        skyTheme: z.enum(['cyber', 'sunset', 'neon', 'sky']).optional(),
        gravity: z.number().optional(),
        doubleJump: z.boolean().optional(),
        dashEnabled: z.boolean().optional(),
        shooterEnabled: z.boolean().optional(),
        requireAllCoins: z.boolean().optional(),
        message: z.string().optional(),
      },
    },
    async ({ projectId, command, ...payload }) => {
      await api(`/api/projects/${encodeURIComponent(projectId)}/game-control`, {
        method: 'POST',
        body: JSON.stringify({ command, source: 'mcp', payload }),
      });
      return {
        content: [{ type: 'text', text: `Executed live game_control '${command}' on project '${projectId}'.` }],
      };
    },
  );

  return server;
}

const isMain = process.argv[1]?.endsWith('opencraft-mcp.mjs');
if (isMain) {
  const server = createOpenCraftMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
