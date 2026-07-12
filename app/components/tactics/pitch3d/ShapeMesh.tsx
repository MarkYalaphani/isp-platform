'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { TBShape } from '@/lib/tactics';
import { pctToWorld, worldToPct, PITCH_WIDTH, PITCH_LENGTH } from './coords';
import { SELECT_COLOR } from './colors';
import HandleSphere from './HandleSphere';
import { DragMode } from './useGroundDrag';

const SHAPE_Y = 0.05;

interface Props {
  shape: TBShape;
  selected: boolean;
  locked: boolean;
  transparency: number;
  onSelect: () => void;
  beginDrag: (mode: DragMode, id: string, offX?: number, offY?: number) => void;
}

export default function ShapeMesh({ shape, selected, locked, transparency, onSelect, beginDrag }: Props) {
  const nx = Math.min(shape.x, shape.x + shape.w);
  const ny = Math.min(shape.y, shape.y + shape.h);
  const nw = Math.abs(shape.w);
  const nh = Math.abs(shape.h);
  const cx = nx + nw / 2, cy = ny + nh / 2;
  const [wx, , wz] = pctToWorld(cx, cy);
  const worldW = (nw / 100) * PITCH_WIDTH;
  const worldD = (nh / 100) * PITCH_LENGTH;
  const opacity = selected ? transparency : shape.opacity;

  const handleBody = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect();
    if (locked) return;
    const p = worldToPct(e.point.x, e.point.z);
    beginDrag('shapeMove', shape.id, p.x - shape.x, p.y - shape.y);
  };

  const [rwx, , rwz] = pctToWorld(shape.x + shape.w, shape.y + shape.h);
  const edgesGeom = useMemo(() => new THREE.PlaneGeometry(worldW, worldD), [worldW, worldD]);

  return (
    <group>
      <mesh
        position={[wx, SHAPE_Y, wz]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={shape.kind === 'circle' ? [worldW / 2, worldD / 2, 1] : [1, 1, 1]}
        onPointerDown={handleBody}
      >
        {shape.kind === 'rect' ? <planeGeometry args={[worldW, worldD]} /> : <circleGeometry args={[1, 32]} />}
        <meshStandardMaterial
          color={shape.color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {shape.kind === 'circle' && (
        <mesh position={[wx, SHAPE_Y, wz]} rotation={[-Math.PI / 2, 0, 0]} scale={[worldW / 2, worldD / 2, 1]}>
          <ringGeometry args={[0.97, 1, 32]} />
          <meshBasicMaterial color={selected ? SELECT_COLOR : shape.color} transparent opacity={0.8} />
        </mesh>
      )}
      {shape.kind === 'rect' && (
        <lineSegments position={[wx, SHAPE_Y + 0.001, wz]} rotation={[-Math.PI / 2, 0, 0]}>
          <edgesGeometry args={[edgesGeom]} />
          <lineBasicMaterial color={selected ? SELECT_COLOR : shape.color} />
        </lineSegments>
      )}

      {selected && !locked && (
        <HandleSphere
          position={[rwx, SHAPE_Y, rwz]}
          radius={0.34}
          onPointerDown={() => beginDrag('shapeResize', shape.id)}
        />
      )}
    </group>
  );
}
