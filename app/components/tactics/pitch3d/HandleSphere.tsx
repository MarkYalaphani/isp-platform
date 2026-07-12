'use client';

import type { ThreeEvent } from '@react-three/fiber';
import { SELECT_COLOR } from './colors';

interface Props {
  position: [number, number, number];
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  radius?: number;
}

export default function HandleSphere({ position, onPointerDown, radius = 0.42 }: Props) {
  return (
    <mesh
      position={position}
      onPointerDown={e => { e.stopPropagation(); onPointerDown(e); }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial color={SELECT_COLOR} emissive={SELECT_COLOR} emissiveIntensity={0.35} />
    </mesh>
  );
}
