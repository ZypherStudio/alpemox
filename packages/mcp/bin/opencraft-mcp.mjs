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

export function createOpenCraftMcpServer() {
  const server = new McpServer({
    name: 'opencraft-mcp',
    version: '0.1.0',
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

  return server;
}

const isMain = process.argv[1]?.endsWith('opencraft-mcp.mjs');
if (isMain) {
  const server = createOpenCraftMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
