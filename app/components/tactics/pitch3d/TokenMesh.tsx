'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { TBToken } from '@/lib/tactics';
import { pctToWorld } from './coords';
import { contrastColor, SELECT_COLOR } from './colors';
import { getBallTexture } from './ballTexture';

interface Props {
  token: TBToken;
  selected: boolean;
  locked: boolean;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
}

function PlayerFigure({ color }: { color: string }) {
  return (
    <group castShadow>
      <mesh position={[0, 0.85, 0]} castShadow>
        <capsuleGeometry args={[0.42, 0.85, 4, 12]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.62, 0]} castShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#f2c9a0" roughness={0.6} />
      </mesh>
    </group>
  );
}

function ConeFigure({ color }: { color: string }) {
  return (
    <mesh position={[0, 0.45, 0]} castShadow>
      <coneGeometry args={[0.42, 0.9, 20]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  );
}

function DiscFigure({ color }: { color: string }) {
  return (
    <mesh position={[0, 0.05, 0]} castShadow>
      <cylinderGeometry args={[0.42, 0.42, 0.09, 24]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  );
}

function PoleFigure({ color }: { color: string }) {
  return (
    <mesh position={[0, 1.05, 0]} castShadow>
      <cylinderGeometry args={[0.075, 0.075, 2.1, 12]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.15} />
    </mesh>
  );
}

function MiniGoalFigure({ color }: { color: string }) {
  const postH = 1.15, span = 1.5;
  return (
    <group>
      <mesh position={[-span / 2, postH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, postH, 10]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      <mesh position={[span / 2, postH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, postH, 10]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      <mesh position={[0, postH, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, span, 10]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      <mesh position={[0, postH * 0.55, -0.35]}>
        <planeGeometry args={[span, postH]} />
        <meshStandardMaterial color="#e2e8f0" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function BallFigure() {
  const texture = useMemo(() => getBallTexture(), []);
  return (
    <mesh position={[0, 0.24, 0]} castShadow>
      <sphereGeometry args={[0.24, 24, 24]} />
      <meshStandardMaterial map={texture} roughness={0.4} />
    </mesh>
  );
}

function BenchFigure({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[-0.85, 0.16, 0]} castShadow>
        <boxGeometry args={[0.1, 0.32, 0.4]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[0.85, 0.16, 0]} castShadow>
        <boxGeometry args={[0.1, 0.32, 0.4]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[0, 0.36, 0]} castShadow>
        <boxGeometry args={[2.1, 0.1, 0.45]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
    </group>
  );
}

export default function TokenMesh({ token, selected, locked, onPointerDown }: Props) {
  const [wx, , wz] = pctToWorld(token.x, token.y);
  const showLabel = token.kind === 'player' && token.label;

  return (
    <group
      position={[wx, 0, wz]}
      rotation={[0, THREE.MathUtils.degToRad(token.rotation || 0), 0]}
      onPointerDown={onPointerDown}
      onPointerOver={() => { if (!locked) document.body.style.cursor = 'grab'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {selected && (
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.68, 32]} />
          <meshBasicMaterial color={SELECT_COLOR} transparent opacity={0.9} />
        </mesh>
      )}

      {token.kind === 'player' && <PlayerFigure color={token.color} />}
      {token.kind === 'mannequin' && <PlayerFigure color={token.color} />}
      {token.kind === 'cone' && <ConeFigure color={token.color} />}
      {token.kind === 'disc' && <DiscFigure color={token.color} />}
      {token.kind === 'pole' && <PoleFigure color={token.color} />}
      {token.kind === 'miniGoal' && <MiniGoalFigure color={token.color} />}
      {token.kind === 'ball' && <BallFigure />}
      {token.kind === 'bench' && <BenchFigure color={token.color} />}

      {showLabel && (
        <Billboard position={[0, 2.35, 0]}>
          <mesh>
            <circleGeometry args={[0.32, 24]} />
            <meshBasicMaterial color={token.color} />
          </mesh>
          <Text fontSize={0.34} color={contrastColor(token.color)} anchorX="center" anchorY="middle" position={[0, 0, 0.01]}>
            {token.label}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
