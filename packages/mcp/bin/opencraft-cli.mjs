#!/usr/bin/env node
const BASE_URL = (process.env.OPENCRAFT_SERVER_URL || 'http://127.0.0.1:4310').replace(/\/$/, '');

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Error:', data.error || res.status);
    process.exit(1);
  }
  return data;
}

const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case 'health': {
    console.log(JSON.stringify(await request('/api/health'), null, 2));
    break;
  }
  case 'state': {
    const id = args[0] || 'default';
    console.log(JSON.stringify(await request(`/api/projects/${encodeURIComponent(id)}`), null, 2));
    break;
  }
  case 'pose': {
    const [objectId = 'mannequin-1', preset = 'heroic', projectId = 'default'] = args;
    const out = await request(`/api/projects/${encodeURIComponent(projectId)}/command`, {
      method: 'POST',
      body: JSON.stringify({ action: 'set_mannequin_pose', source: 'cli', payload: { id: objectId, preset } }),
    });
    console.log(`Updated ${objectId} to pose '${preset}' (objects: ${out.project.objects3d.length})`);
    break;
  }
  case 'add-3d': {
    const [kind = 'box', name = 'CLI Object', projectId = 'default'] = args;
    const out = await request(`/api/projects/${encodeURIComponent(projectId)}/command`, {
      method: 'POST',
      body: JSON.stringify({ action: 'add_3d_object', source: 'cli', payload: { kind, name } }),
    });
    console.log(`Added 3D ${kind} '${name}' (total: ${out.project.objects3d.length})`);
    break;
  }
  case 'craft': {
    const prompt = args.join(' ') || 'Cinematic scene';
    const out = await request('/api/craft', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'default',
        workflow: 'text-to-image',
        provider: 'procedural',
        modelId: 'procedural-studio-preview',
        prompt,
        width: 1024,
        height: 1024,
        steps: 20,
        cfgScale: 7,
        seed: 0,
        denoise: 0.72,
      }),
    });
    console.log(`Craft completed: id=${out.output.id}, seed=${out.output.seed}, provider=${out.output.provider}`);
    break;
  }
  default:
    console.log(`OpenCraft CLI
Usage:
  opencraft-cli health
  opencraft-cli state [projectId]
  opencraft-cli pose <objectId> <neutral|heroic|action|sitting|walking> [projectId]
  opencraft-cli add-3d <mannequin|box|sphere|cylinder|backdrop> <name> [projectId]
  opencraft-cli craft "<prompt>"`);
}
