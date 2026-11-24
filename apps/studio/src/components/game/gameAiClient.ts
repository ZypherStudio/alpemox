import type { LlmLevelSpec } from './gameTemplates';

export type GameAiProvider = 'builtin' | 'ollama' | 'openai-compat';

export interface GameAiConfig {
  provider: GameAiProvider;
  ollamaUrl: string;
  ollamaModel: string;
  customBaseUrl: string;
  customModel: string;
  customApiKey: string;
  systemPrompt: string;
  customBotRule: 'none' | 'flee-player' | 'orbit-coins' | 'custom-js';
  customBotJs: string;
}

export interface GameAiResponse {
  ok: boolean;
  provider: string;
  model: string;
  usedFallback?: boolean;
  fallbackReason?: string | null;
  reply: string;
  levelSpec?: LlmLevelSpec | null;
}

export async function callGameAi(
  task: 'level' | 'npc-chat',
  prompt: string,
  cfg: GameAiConfig,
  gameState?: { score: number; coins: number; totalCoins: number; hp: number },
): Promise<GameAiResponse> {
  const res = await fetch('/api/game/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task,
      provider: cfg.provider,
      prompt,
      systemPrompt: cfg.systemPrompt,
      ollamaUrl: cfg.ollamaUrl,
      ollamaModel: cfg.ollamaModel,
      customBaseUrl: cfg.customBaseUrl,
      customModel: cfg.customModel,
      customApiKey: cfg.customApiKey,
      gameState,
    }),
  });
  if (!res.ok) {
    throw new Error(`AI API Hatası (${res.status})`);
  }
  return (await res.json()) as GameAiResponse;
}

export function compileCustomBotFn(
  rule: GameAiConfig['customBotRule'],
  jsCode: string,
): ((ctx: { dist: number; dx: number; dz: number; elapsed: number; baseSpeed: number }) => {
  vx: number;
  vz: number;
  jump?: number;
}) | null {
  if (rule === 'flee-player') {
    return ({ dist, dx, dz, baseSpeed }) => {
      if (dist > 10 || dist < 0.05) return { vx: 0, vz: 0 };
      const len = Math.hypot(dx, dz) || 1;
      return { vx: (-dx / len) * baseSpeed, vz: (-dz / len) * baseSpeed };
    };
  }
  if (rule === 'orbit-coins') {
    return ({ elapsed, baseSpeed }) => ({
      vx: Math.cos(elapsed * 1.8) * baseSpeed * 0.9,
      vz: Math.sin(elapsed * 1.8) * baseSpeed * 0.9,
    });
  }
  if (rule === 'custom-js' && jsCode.trim()) {
    try {
      const fn = new Function(
        'dist',
        'dx',
        'dz',
        'elapsed',
        'speed',
        `"use strict"; let vx = 0, vz = 0; ${jsCode}; return { vx, vz };`,
      ) as (dist: number, dx: number, dz: number, elapsed: number, speed: number) => {
        vx?: number;
        vz?: number;
      };
      return ({ dist, dx, dz, elapsed, baseSpeed }) => {
        const out = fn(dist, dx, dz, elapsed, baseSpeed) || {};
        return {
          vx: Number.isFinite(out.vx) ? Number(out.vx) : 0,
          vz: Number.isFinite(out.vz) ? Number(out.vz) : 0,
        };
      };
    } catch {
      return null;
    }
  }
  return null;
}
