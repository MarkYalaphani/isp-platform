'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { PITCH_WIDTH, PITCH_LENGTH } from './coords';

function buildPitchTexture(): THREE.CanvasTexture {
  const res = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = res; canvas.height = res;
  const ctx = canvas.getContext('2d')!;

  const bands = 12;
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#2f9e44' : '#37b24d';
    ctx.fillRect(Math.floor((i / bands) * res), 0, Math.ceil(res / bands) + 1, res);
  }

  const toPx = (v: number) => (v / 100) * res;
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = res * 0.0035;

  const strokeRect = (x: number, y: number, w: number, h: number) =>
    ctx.strokeRect(toPx(x), toPx(y), toPx(w), toPx(h));

  strokeRect(3, 3, 94, 94);
  ctx.beginPath();
  ctx.moveTo(toPx(3), toPx(50));
  ctx.lineTo(toPx(97), toPx(50));
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(toPx(50), toPx(50), toPx(9), 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(toPx(50), toPx(50), toPx(0.8), 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();
  strokeRect(30, 3, 40, 16);
  strokeRect(30, 81, 40, 16);
  strokeRect(40, 3, 20, 6);
  strokeRect(40, 91, 20, 6);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

interface Props {
  onGroundPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
}

export default function PitchSurface({ onGroundPointerDown }: Props) {
  const texture = useMemo(() => buildPitchTexture(), []);

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onPointerDown={onGroundPointerDown}
      >
        <planeGeometry args={[PITCH_WIDTH, PITCH_LENGTH]} />
        <meshStandardMaterial map={texture} roughness={0.92} metalness={0} />
      </mesh>

      <ambientLight intensity={0.65} />
      <hemisphereLight args={['#dff5e1', '#1b4332', 0.45]} />
      <directionalLight
        position={[26, 42, 18]}
        intensity={1.15}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
    </group>
  );
}
