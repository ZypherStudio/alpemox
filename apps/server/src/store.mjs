import fs from 'node:fs';
import path from 'node:path';
import { createDefaultProject, clonePose, MANNEQUIN_POSE_PRESETS, DEFAULT_STAGE_LIGHTING } from '@opencraft/shared';

export class ProjectStore {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.projectsDir = path.join(this.dataDir, 'projects');
    fs.mkdirSync(this.projectsDir, { recursive: true });
  }

  sanitizeId(id) {
    return String(id || 'default').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64) || 'default';
  }

  filePath(id) {
    return path.join(this.projectsDir, `${this.sanitizeId(id)}.json`);
  }

  listProjects() {
    const files = fs.readdirSync(this.projectsDir).filter((f) => f.endsWith('.json'));
    if (files.length === 0) {
      const def = createDefaultProject('default', 'Yeni Sahne Stüdyosu');
      this.saveProject(def);
      return [{ id: def.id, name: def.name, updatedAt: def.updatedAt }];
    }
    return files
      .map((file) => {
        try {
          const raw = JSON.parse(fs.readFileSync(path.join(this.projectsDir, file), 'utf8'));
          return { id: raw.id, name: raw.name, updatedAt: raw.updatedAt };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  getProject(id = 'default') {
    const safeId = this.sanitizeId(id);
    const fp = this.filePath(safeId);
    if (!fs.existsSync(fp)) {
      const created = createDefaultProject(safeId, safeId === 'default' ? 'Alpemox Sahne 01' : safeId);
      this.saveProject(created);
      return created;
    }
    const parsed = JSON.parse(fs.readFileSync(fp, 'utf8'));
    if (!Array.isArray(parsed.vectors)) parsed.vectors = [];
    if (!Array.isArray(parsed.audioClips)) parsed.audioClips = [];
    if (!Array.isArray(parsed.moodboard)) parsed.moodboard = [];
    if (!parsed.stageLighting) parsed.stageLighting = { ...DEFAULT_STAGE_LIGHTING };
    return parsed;
  }

  createProject(id, name) {
    const safeId = this.sanitizeId(id || `proj-${Date.now()}`);
    const project = createDefaultProject(safeId, name || safeId);
    return this.saveProject(project);
  }

  saveProject(project) {
    const safeId = this.sanitizeId(project.id);
    const next = {
      ...project,
      id: safeId,
      updatedAt: new Date().toISOString(),
    };
    const fp = this.filePath(safeId);
    const tmp = `${fp}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
    fs.renameSync(tmp, fp);
    return next;
  }

  applyCommand(projectId, command) {
    const project = this.getProject(projectId);
    const { action, payload = {} } = command || {};
    const makeId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    switch (action) {
      case 'add_2d_layer': {
        const layer = {
          id: payload.id || makeId('layer'),
          name: payload.name || 'Yeni Katman',
          kind: payload.kind || 'shape',
          visible: payload.visible ?? true,
          locked: payload.locked ?? false,
          opacity: payload.opacity ?? 1,
          blendMode: payload.blendMode || 'normal',
          x: payload.x ?? 120,
          y: payload.y ?? 120,
          width: payload.width ?? 360,
          height: payload.height ?? 360,
          rotation: payload.rotation ?? 0,
          dataUrl: payload.dataUrl,
          shapeType: payload.shapeType || 'rect',
          fillColor: payload.fillColor || '#38bdf8',
          strokeColor: payload.strokeColor || '#0284c7',
          textContent: payload.textContent,
          fontSize: payload.fontSize || 32,
        };
        project.layers2d.push(layer);
        break;
      }
      case 'update_2d_layer': {
        const idx = project.layers2d.findIndex((l) => l.id === payload.id);
        if (idx === -1) throw new Error(`2D layer not found: ${payload.id}`);
        project.layers2d[idx] = { ...project.layers2d[idx], ...payload.patch };
        break;
      }
      case 'delete_2d_layer': {
        project.layers2d = project.layers2d.filter((l) => l.id !== payload.id);
        break;
      }
      case 'add_3d_object': {
        const kind = payload.kind || 'box';
        const obj = {
          id: payload.id || makeId('obj3d'),
          name: payload.name || `3D ${kind}`,
          kind,
          visible: payload.visible ?? true,
          position: payload.position || { x: 0, y: kind === 'mannequin' ? 0 : 0.6, z: 0 },
          rotation: payload.rotation || { x: 0, y: 0, z: 0 },
          scale: payload.scale || { x: 1, y: 1, z: 1 },
          color: payload.color || '#38bdf8',
          pose: kind === 'mannequin' ? clonePose(payload.posePreset || 'neutral') : undefined,
          textureDataUrl: payload.textureDataUrl,
        };
        project.objects3d.push(obj);
        break;
      }
      case 'update_3d_object': {
        const idx = project.objects3d.findIndex((o) => o.id === payload.id);
        if (idx === -1) throw new Error(`3D object not found: ${payload.id}`);
        project.objects3d[idx] = { ...project.objects3d[idx], ...payload.patch };
        break;
      }
      case 'delete_3d_object': {
        project.objects3d = project.objects3d.filter((o) => o.id !== payload.id);
        break;
      }
      case 'set_mannequin_pose': {
        const obj = project.objects3d.find((o) => o.id === payload.id && o.kind === 'mannequin');
        if (!obj) throw new Error(`Mannequin not found: ${payload.id}`);
        if (payload.preset && MANNEQUIN_POSE_PRESETS[payload.preset]) {
          obj.pose = clonePose(payload.preset);
        }
        if (payload.joints && obj.pose) {
          obj.pose = { ...obj.pose, ...payload.joints, preset: payload.preset || 'custom' };
        }
        break;
      }
      case 'set_camera': {
        project.camera3d = {
          position: payload.position || project.camera3d.position,
          target: payload.target || project.camera3d.target,
          fov: payload.fov ?? project.camera3d.fov,
        };
        break;
      }
      case 'add_storyboard_shot': {
        project.storyboard.push({
          id: payload.id || makeId('shot'),
          title: payload.title || `Shot ${String(project.storyboard.length + 1).padStart(2, '0')}`,
          prompt: payload.prompt || '',
          imageUrl: payload.imageUrl,
          durationSec: payload.durationSec ?? 3,
          cameraNote: payload.cameraNote || '',
          createdAt: new Date().toISOString(),
        });
        break;
      }
      case 'set_pipeline': {
        if (Array.isArray(payload.nodes)) project.pipelineNodes = payload.nodes;
        if (Array.isArray(payload.edges)) project.pipelineEdges = payload.edges;
        break;
      }
      default:
        throw new Error(`Unknown command action: ${action}`);
    }

    return this.saveProject(project);
  }
}
