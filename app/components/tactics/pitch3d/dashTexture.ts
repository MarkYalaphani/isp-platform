import * as THREE from 'three';

const baseCache = new Map<string, THREE.CanvasTexture>();

function getBaseDashTexture(style: 'dashed' | 'dotted'): THREE.CanvasTexture {
  const cached = baseCache.get(style);
  if (cached) return cached;

  const w = 64, h = 8;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  if (style === 'dashed') {
    ctx.fillRect(0, 0, w * 0.55, h);
  } else {
    ctx.beginPath();
    ctx.arc(w * 0.2, h / 2, h * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  baseCache.set(style, texture);
  return texture;
}

/** Returns a texture instance whose horizontal repeat matches the given curve length, so
 * dash/dot spacing stays visually consistent regardless of an individual arrow's length. */
export function getDashTexture(style: 'dashed' | 'dotted', curveLength: number): THREE.Texture {
  const base = getBaseDashTexture(style);
  const clone = base.clone();
  clone.needsUpdate = true;
  clone.wrapS = THREE.RepeatWrapping;
  clone.wrapT = THREE.RepeatWrapping;
  const period = style === 'dashed' ? 2.2 : 1.1;
  clone.repeat.set(Math.max(1, curveLength / period), 1);
  return clone;
}
