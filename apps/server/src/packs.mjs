import JSZip from 'jszip';

const OBJ_PEDESTAL = `# Alpemox 3D Pedestal
o Pedestal
v -0.6 0.0 -0.6
v 0.6 0.0 -0.6
v 0.6 0.0 0.6
v -0.6 0.0 0.6
v -0.45 1.0 -0.45
v 0.45 1.0 -0.45
v 0.45 1.0 0.45
v -0.45 1.0 0.45
f 1 2 3 4
f 5 8 7 6
f 1 5 6 2
f 2 6 7 3
f 3 7 8 4
f 4 8 5 1
`;

const OBJ_MONOLITH = `# Alpemox Cyber Monolith
o Monolith
v -0.4 0.0 -0.2
v 0.4 0.0 -0.2
v 0.4 0.0 0.2
v -0.4 0.0 0.2
v -0.25 2.4 -0.12
v 0.25 2.4 -0.12
v 0.25 2.4 0.12
v -0.25 2.4 0.12
f 1 2 3 4
f 5 8 7 6
f 1 5 6 2
f 2 6 7 3
f 3 7 8 4
f 4 8 5 1
`;

function makeCubeLut(title, rScale, gScale, bScale) {
  const lines = [`TITLE "${title}"`, 'LUT_3D_SIZE 2', 'DOMAIN_MIN 0.0 0.0 0.0', 'DOMAIN_MAX 1.0 1.0 1.0'];
  for (let b = 0; b <= 1; b++) {
    for (let g = 0; g <= 1; g++) {
      for (let r = 0; r <= 1; r++) {
        lines.push(`${(r * rScale).toFixed(4)} ${(g * gScale).toFixed(4)} ${(b * bScale).toFixed(4)}`);
      }
    }
  }
  return lines.join('\n') + '\n';
}

export async function buildDownloadablePackBuffer(packId) {
  const zip = new JSZip();

  if (packId === 'alpemox-3d-props') {
    zip.file('pedestal.obj', OBJ_PEDESTAL);
    zip.file('cyber-monolith.obj', OBJ_MONOLITH);
    zip.file(
      'README-props.txt',
      'Alpemox 3D Studio Props Pack\nBu .obj dosyalarını Blender, Three.js veya Alpemox 3D sahnenizde kullanabilirsiniz.\n',
    );
  } else if (packId === 'alpemox-luts') {
    zip.file('teal-orange.cube', makeCubeLut('Alpemox Teal Orange', 1.05, 0.96, 0.92));
    zip.file('cyber-neon.cube', makeCubeLut('Alpemox Cyber Neon', 0.95, 1.02, 1.12));
    zip.file('film-noir.cube', makeCubeLut('Alpemox Film Noir', 0.85, 0.85, 0.88));
    zip.file('warm-kodak.cube', makeCubeLut('Alpemox Warm Kodak', 1.08, 1.0, 0.86));
    zip.file('nordic-cool.cube', makeCubeLut('Alpemox Nordic Cool', 0.9, 0.98, 1.08));
  } else if (packId === 'alpemox-vector-kit') {
    zip.file(
      'alpemox-emblem.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect x="16" y="16" width="224" height="224" rx="48" fill="#111827" stroke="#38bdf8" stroke-width="8"/><path d="M128 48L204 200H164L146 162H110L92 200H52L128 48Z" fill="#4e7bfb"/></svg>',
    );
    zip.file(
      'hud-frame.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 256"><path d="M24 64V24H96M416 24H488V64M488 192V232H416M96 232H24V192" fill="none" stroke="#38bdf8" stroke-width="6"/></svg>',
    );
    zip.file(
      'cyber-badge.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120"><rect x="8" y="8" width="304" height="104" rx="16" fill="#0f172a" stroke="#a855f7" stroke-width="4"/><text x="36" y="72" fill="#f8fafc" font-family="sans-serif" font-size="34" font-weight="700">ALPEMOX HUD</text></svg>',
    );
  } else if (packId === 'alpemox-workflows') {
    zip.file(
      'flux-depth-stage.alpemox-flow.json',
      JSON.stringify(
        {
          name: 'Alpemox Flux + 3D Depth Stage Flow',
          version: '0.3.0',
          nodes: [
            { id: 'n1', type: 'prompt', label: 'Yönetmen Prompt', x: 40, y: 60, config: { prompt: 'Cyberpunk studio portrait, rim light' } },
            { id: 'n2', type: 'stage3d', label: '3D Sahne Depth', x: 40, y: 240, config: { captureMode: 'rgb+depth' } },
            { id: 'n3', type: 'controlnet', label: 'Depth ControlNet', x: 340, y: 180, config: { weight: 0.8 } },
            { id: 'n4', type: 'model', label: 'Open Source Flux', x: 640, y: 140, config: { provider: 'pollinations', modelId: 'pollinations-flux' } },
            { id: 'n5', type: 'output', label: '2D Katman Çıktı', x: 920, y: 160, config: { autoAddLayer: true } },
          ],
          edges: [
            { id: 'e1', from: 'n1', fromPort: 'prompt', to: 'n4', toPort: 'prompt' },
            { id: 'e2', from: 'n2', fromPort: 'depth', to: 'n3', toPort: 'depth' },
            { id: 'e3', from: 'n3', fromPort: 'guide', to: 'n4', toPort: 'control' },
            { id: 'e4', from: 'n4', fromPort: 'result', to: 'n5', toPort: 'input' },
          ],
        },
        null,
        2,
      ),
    );
    zip.file(
      'comfyui-api-template.json',
      JSON.stringify(
        {
          '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'flux1-dev.safetensors' } },
          '2': { class_type: 'CLIPTextEncode', inputs: { text: 'Alpemox cinematic studio render', clip: ['1', 1] } },
          '3': { class_type: 'EmptyLatentImage', inputs: { width: 1024, height: 1024, batch_size: 1 } },
        },
        null,
        2,
      ),
    );
  } else {
    throw new Error(`Bilinmeyen paket ID: ${packId}`);
  }

  return zip.generateAsync({ type: 'nodebuffer' });
}
