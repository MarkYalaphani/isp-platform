'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { TBArrow } from '@/lib/tactics';
import { pctToWorld } from './coords';
import { getDashTexture } from './dashTexture';
import { SELECT_COLOR } from './colors';
import HandleSphere from './HandleSphere';
import { DragMode } from './useGroundDrag';

const ARROW_Y = 0.14;

type Pct = { x: number; y: number };

function toWorldVec(p: Pct): THREE.Vector3 {
  const [x, , z] = pctToWorld(p.x, p.y);
  return new THREE.Vector3(x, ARROW_Y, z);
}

function curvedControlPct(from: Pct, to: Pct, bend: number): Pct {
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
  return { x: mx + nx * bend, y: my + ny * bend };
}

function squigglyPointsPct(from: Pct, to: Pct): Pct[] {
  const segs = 10;
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const amp = 1.6;
  const pts: Pct[] = [from];
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const px = from.x + dx * t, py = from.y + dy * t;
    const off = (i % 2 === 0 ? 1 : -1) * (i === segs ? 0 : amp);
    pts.push({ x: px + nx * off, y: py + ny * off });
  }
  return pts;
}

interface Props {
  arrow: TBArrow;
  selected: boolean;
  locked: boolean;
  onSelectPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  beginDrag: (mode: DragMode, id: string) => void;
}

export default function ArrowMesh({ arrow, selected, locked, onSelectPointerDown, beginDrag }: Props) {
  const controlPct = arrow.shape === 'curved' ? curvedControlPct(arrow.from, arrow.to, arrow.bend) : null;

  const curve = useMemo(() => {
    if (arrow.shape === 'straight') {
      return new THREE.LineCurve3(toWorldVec(arrow.from), toWorldVec(arrow.to));
    }
    if (arrow.shape === 'curved' && controlPct) {
      return new THREE.QuadraticBezierCurve3(toWorldVec(arrow.from), toWorldVec(controlPct), toWorldVec(arrow.to));
    }
    const pts = squigglyPointsPct(arrow.from, arrow.to).map(toWorldVec);
    return new THREE.CatmullRomCurve3(pts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrow.shape, arrow.from.x, arrow.from.y, arrow.to.x, arrow.to.y, arrow.bend]);

  const tubularSegments = arrow.shape === 'squiggly' ? 64 : 24;
  const radius = selected ? 0.13 : 0.09;

  const material = useMemo(() => {
    if (arrow.lineStyle === 'solid') {
      return new THREE.MeshStandardMaterial({ color: arrow.color, roughness: 0.4 });
    }
    const length = curve.getLength();
    const tex = getDashTexture(arrow.lineStyle, length);
    return new THREE.MeshStandardMaterial({ color: arrow.color, alphaMap: tex, transparent: true, roughness: 0.4 });
  }, [arrow.lineStyle, arrow.color, curve]);

  const headEnd = curve.getPoint(1);
  const tangent = curve.getTangent(1).normalize();
  const headQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
  const headPos = headEnd.clone().addScaledVector(tangent, 0.32);

  return (
    <group>
      <mesh onPointerDown={e => { e.stopPropagation(); onSelectPointerDown(e); }} material={material}>
        <tubeGeometry args={[curve, tubularSegments, radius, 8, false]} />
      </mesh>

      {arrow.head && (
        <mesh position={headPos} quaternion={headQuat}>
          <coneGeometry args={[0.32, 0.62, 14]} />
          <meshStandardMaterial color={arrow.color} roughness={0.4} />
        </mesh>
      )}

      {selected && !locked && (
        <>
          <HandleSphere position={toWorldVec(arrow.from).toArray()} radius={0.32}
            onPointerDown={() => beginDrag('arrowStart', arrow.id)} />
          <HandleSphere position={toWorldVec(arrow.to).toArray()} radius={0.32}
            onPointerDown={() => beginDrag('arrowEnd', arrow.id)} />
          {arrow.shape === 'curved' && controlPct && (
            <HandleSphere position={toWorldVec(controlPct).toArray()} radius={0.28}
              onPointerDown={() => beginDrag('arrowBend', arrow.id)} />
          )}
        </>
      )}
      {selected && (
        <mesh>
          <tubeGeometry args={[curve, tubularSegments, radius + 0.02, 8, false]} />
          <meshBasicMaterial color={SELECT_COLOR} transparent opacity={0.25} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
