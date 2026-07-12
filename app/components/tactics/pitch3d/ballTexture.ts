import * as THREE from 'three';

let cached: THREE.CanvasTexture | null = null;

export function getBallTexture(): THREE.CanvasTexture {
  if (cached) return cached;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#111827';
  const pentagon = (cx: number, cy: number, r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  };
  pentagon(size * 0.28, size * 0.3, size * 0.13);
  pentagon(size * 0.72, size * 0.28, size * 0.13);
  pentagon(size * 0.5, size * 0.62, size * 0.14);
  pentagon(size * 0.16, size * 0.72, size * 0.11);
  pentagon(size * 0.85, size * 0.7, size * 0.11);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cached = texture;
  return texture;
}
