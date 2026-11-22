/*
 * Adapted from ArtCraft (https://github.com/storytold/artcraft)
 * frontend/apps/artcraft/app/src/pages/PageAngles/OrbitSphere.tsx
 * Dual-licensed under the MIT License or Apache License, Version 2.0:
 * Copyright (c) 2026 ArtCraft Team and the ArtCraft contributors.
 */
import { useRef, useEffect, useCallback, memo } from 'react';

export const ORBIT_ROTATION_VALUES = [0, 45, 90, 135, 180, 225, 270, 315];
export const ORBIT_TILT_VALUES = [-30, 0, 30, 60];

export interface OrbitSphereProps {
  rotation: number;
  tilt: number;
  onDragEnd: (rotation: number, tilt: number) => void;
}

export const snapToNearest = (value: number, allowedValues: number[]): number => {
  let closest = allowedValues[0];
  let minDist = Math.abs(value - closest);
  for (const v of allowedValues) {
    const dist = Math.abs(value - v);
    if (dist < minDist) {
      minDist = dist;
      closest = v;
    }
  }
  return closest;
};

interface Face {
  pts: { x: number; y: number; depth: number }[];
  fillColor: string;
  edgeColor: string;
  edgeWidth: number;
  isFront: boolean;
  isBack: boolean;
  isBodyFront: boolean;
  avgDepth: number;
  isLine?: boolean;
}

export const OrbitSphere = memo(({ rotation, tilt, onDragEnd }: OrbitSphereProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const liveRotation = useRef(rotation);
  const liveTilt = useRef(tilt);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (!isDragging.current) {
      liveRotation.current = rotation;
      liveTilt.current = tilt;
    }
  }, [rotation, tilt]);

  const drawSphere = useCallback((renderRotation: number, renderTilt: number, dragging = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const displayW = canvas.clientWidth || 152;
    const displayH = canvas.clientHeight || 152;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = displayW;
    const h = displayH;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.4;

    ctx.clearRect(0, 0, w, h);

    const outerGlow = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 1.3);
    outerGlow.addColorStop(0, 'rgba(56, 189, 248, 0.06)');
    outerGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = outerGlow;
    ctx.fillRect(0, 0, w, h);

    const rotRad = (renderRotation * Math.PI) / 180;
    const tiltRad = (renderTilt * Math.PI) / 180;

    const project = (x3d: number, y3d: number, z3d: number) => {
      const perspective = 6;
      const scale = perspective / (perspective - z3d);
      return {
        x: cx + x3d * radius * scale,
        y: cy + y3d * radius * scale,
        depth: z3d,
      };
    };

    const wireAlpha = dragging ? 0.16 : 0.09;
    ctx.strokeStyle = `rgba(186, 230, 253, ${wireAlpha})`;
    ctx.lineWidth = 0.75;

    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6 + rotRad;
      ctx.beginPath();
      for (let j = 0; j <= 36; j++) {
        const phi = (j / 36) * Math.PI * 2;
        const p = project(Math.cos(angle) * Math.sin(phi), Math.cos(phi), Math.sin(angle) * Math.sin(phi));
        if (j === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    for (let i = 1; i < 6; i++) {
      const phi = (i * Math.PI) / 6;
      ctx.beginPath();
      for (let j = 0; j <= 36; j++) {
        const angle = (j / 36) * Math.PI * 2 + rotRad;
        const p = project(Math.cos(angle) * Math.sin(phi), Math.cos(phi), Math.sin(angle) * Math.sin(phi));
        if (j === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    const camPosX = Math.sin(rotRad) * Math.cos(tiltRad);
    const camPosY = -Math.sin(tiltRad);
    const camPosZ = Math.cos(rotRad) * Math.cos(tiltRad);
    const centerScreen = project(0, 0, 0);

    const dirX = -camPosX;
    const dirY = -camPosY;
    const dirZ = -camPosZ;

    let rightX = dirZ;
    const rightY = 0;
    let rightZ = -dirX;
    const rightLen = Math.sqrt(rightX * rightX + rightZ * rightZ) || 1;
    rightX /= rightLen;
    rightZ /= rightLen;

    let upX = rightY * dirZ - rightZ * dirY;
    let upY = rightZ * dirX - rightX * dirZ;
    let upZ = rightX * dirY - rightY * dirX;
    const upLen = Math.sqrt(upX * upX + upY * upY + upZ * upZ) || 1;
    upX /= upLen;
    upY /= upLen;
    upZ /= upLen;

    const bodyW = 0.28;
    const bodyH = 0.19;
    const bodyD = 0.22;

    const makeBox = (bx: number, by: number, bz: number, hw: number, hh: number, hd: number) => [
      { x: bx + rightX * hw + upX * hh, y: by + rightY * hw + upY * hh, z: bz + rightZ * hw + upZ * hh },
      { x: bx - rightX * hw + upX * hh, y: by - rightY * hw + upY * hh, z: bz - rightZ * hw + upZ * hh },
      { x: bx - rightX * hw - upX * hh, y: by - rightY * hw - upY * hh, z: bz - rightZ * hw - upZ * hh },
      { x: bx + rightX * hw - upX * hh, y: by + rightY * hw - upY * hh, z: bz + rightZ * hw - upZ * hh },
      { x: bx + dirX * hd + rightX * hw + upX * hh, y: by + dirY * hd + rightY * hw + upY * hh, z: bz + dirZ * hd + rightZ * hw + upZ * hh },
      { x: bx + dirX * hd - rightX * hw + upX * hh, y: by + dirY * hd - rightY * hw + upY * hh, z: bz + dirZ * hd - rightZ * hw + upZ * hh },
      { x: bx + dirX * hd - rightX * hw - upX * hh, y: by + dirY * hd - rightY * hw - upY * hh, z: bz + dirZ * hd - rightZ * hw - upZ * hh },
      { x: bx + dirX * hd + rightX * hw - upX * hh, y: by + dirY * hd + rightY * hw - upY * hh, z: bz + dirZ * hd + rightZ * hw - upZ * hh },
    ];

    const bodyCorners = makeBox(camPosX, camPosY, camPosZ, bodyW, bodyH, bodyD).map((c) => project(c.x, c.y, c.z));
    const lensLen = 0.14;
    const lensR = 0.1;
    const lensCx = camPosX + dirX * bodyD;
    const lensCy = camPosY + dirY * bodyD;
    const lensCz = camPosZ + dirZ * bodyD;

    const BOX_FACES: [number, number, number, number][] = [
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [0, 1, 5, 4],
      [3, 2, 6, 7],
      [1, 2, 6, 5],
      [0, 3, 7, 4],
    ];
    const allFaces: Face[] = [];

    for (let i = 0; i < 6; i++) {
      const pts = BOX_FACES[i].map((idx) => bodyCorners[idx]);
      allFaces.push({
        pts,
        fillColor: 'rgba(35, 38, 45, 0.92)',
        edgeColor: 'rgba(180, 200, 255, 0.35)',
        edgeWidth: 1.0,
        isFront: false,
        isBack: i === 0,
        isBodyFront: i === 1,
        avgDepth: pts.reduce((s, p) => s + p.depth, 0) / pts.length,
      });
    }

    const basePts: { x: number; y: number; z: number }[] = [];
    const frontPts: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const lx = Math.cos(a) * lensR;
      const ly = Math.sin(a) * lensR;
      basePts.push({ x: lensCx + rightX * lx + upX * ly, y: lensCy + rightY * lx + upY * ly, z: lensCz + rightZ * lx + upZ * ly });
      frontPts.push({
        x: lensCx + dirX * lensLen + rightX * lx + upX * ly,
        y: lensCy + dirY * lensLen + rightY * lx + upY * ly,
        z: lensCz + dirZ * lensLen + rightZ * lx + upZ * ly,
      });
    }
    for (let i = 0; i < 16; i++) {
      const ni = (i + 1) % 16;
      const pts = [basePts[i], basePts[ni], frontPts[ni], frontPts[i]].map((pt) => project(pt.x, pt.y, pt.z));
      allFaces.push({
        pts,
        fillColor: 'rgba(28, 30, 38, 0.95)',
        edgeColor: 'rgba(180, 200, 255, 0.55)',
        edgeWidth: 0.8,
        isFront: false,
        isBack: false,
        isBodyFront: false,
        avgDepth: pts.reduce((s, p) => s + p.depth, 0) / pts.length,
      });
    }
    const capPts = frontPts.map((p) => project(p.x, p.y, p.z));
    allFaces.push({
      pts: capPts,
      fillColor: 'rgba(56, 189, 248, 0.25)',
      edgeColor: 'rgba(180, 200, 255, 0.65)',
      edgeWidth: 0.9,
      isFront: true,
      isBack: false,
      isBodyFront: false,
      avgDepth: capPts.reduce((s, p) => s + p.depth, 0) / capPts.length,
    });

    const lensTip = project(lensCx + dirX * lensLen, lensCy + dirY * lensLen, lensCz + dirZ * lensLen);
    allFaces.push({
      pts: [lensTip, centerScreen],
      fillColor: '',
      edgeColor: '',
      edgeWidth: 0,
      isFront: false,
      isBack: false,
      isBodyFront: false,
      avgDepth: (lensTip.depth + centerScreen.depth) / 2,
      isLine: true,
    });

    allFaces.sort((a, b) => a.avgDepth - b.avgDepth);
    ctx.lineJoin = 'round';

    for (const face of allFaces) {
      if (face.isLine) {
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.78)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(face.pts[0].x, face.pts[0].y);
        ctx.lineTo(face.pts[1].x, face.pts[1].y);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(face.pts[0].x, face.pts[0].y);
      for (let i = 1; i < face.pts.length; i++) ctx.lineTo(face.pts[i].x, face.pts[i].y);
      ctx.closePath();
      ctx.fillStyle = face.fillColor;
      ctx.fill();
      ctx.strokeStyle = face.edgeColor;
      ctx.lineWidth = face.edgeWidth;
      ctx.stroke();

      if (face.isBodyFront) {
        const dot = project(
          camPosX + dirX * bodyD + rightX * bodyW * 0.6 + upX * bodyH * 0.6,
          camPosY + dirY * bodyD + rightY * bodyW * 0.6 + upY * bodyH * 0.6,
          camPosZ + dirZ * bodyD + rightZ * bodyW * 0.6 + upZ * bodyH * 0.6,
        );
        ctx.fillStyle = 'rgba(255, 60, 60, 1)';
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(centerScreen.x - 5, centerScreen.y);
    ctx.lineTo(centerScreen.x + 5, centerScreen.y);
    ctx.moveTo(centerScreen.x, centerScreen.y - 5);
    ctx.lineTo(centerScreen.x, centerScreen.y + 5);
    ctx.stroke();
  }, []);

  useEffect(() => {
    if (!isDragging.current) drawSphere(rotation, tilt);
  }, [rotation, tilt, drawSphere]);

  const drawSphereRef = useRef(drawSphere);
  drawSphereRef.current = drawSphere;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };

      liveRotation.current += dx * 0.8;
      liveTilt.current = Math.max(-30, Math.min(60, liveTilt.current - dy * 0.8));

      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        drawSphereRef.current(liveRotation.current, liveTilt.current, true);
        rafId.current = null;
      });
    };

    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      let rawRot = liveRotation.current % 360;
      if (rawRot < 0) rawRot += 360;
      const snappedRot = snapToNearest(rawRot, ORBIT_ROTATION_VALUES);
      const snappedTilt = snapToNearest(liveTilt.current, ORBIT_TILT_VALUES);
      liveRotation.current = snappedRot;
      liveTilt.current = snappedTilt;
      drawSphereRef.current(snappedRot, snappedTilt);
      onDragEndRef.current(snappedRot, snappedTilt);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="h-[144px] w-[144px] cursor-grab active:cursor-grabbing"
      style={{ width: '144px', height: '144px' }}
      onMouseDown={(e) => {
        isDragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
      }}
    />
  );
});

OrbitSphere.displayName = 'OrbitSphere';
