'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { TBToken, PlayerPose } from '@/lib/tactics';
import { pctToWorld } from './coords';
import { contrastColor, SELECT_COLOR } from './colors';
import { getBallTexture } from './ballTexture';
import { getNetTexture } from './netTexture';

interface Props {
  token: TBToken;
  selected: boolean;
  locked: boolean;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
}

// Always-camera-facing flat "sprite" figure — jersey-colored torso, white
// shorts, simple limb silhouette. Billboard keeps it readable at any camera
// angle/zoom, matching how top-down tactics-board apps render players.
const SPRITE_SHORTS = '#f1f5f9';
const SPRITE_SKIN = '#f2c9a0';
const SPRITE_LEG = '#1f2937';

interface FlatPose { legL: number; legR: number; armL: number; armR: number; tilt: number; }
const FLAT_POSES: Record<PlayerPose, FlatPose> = {
  standing: { legL: 0.1, legR: -0.1, armL: 0.15, armR: -0.15, tilt: 0 },
  running: { legL: 0.6, legR: -0.7, armL: -0.55, armR: 0.6, tilt: 0.06 },
  dribbling: { legL: 0.3, legR: 0.15, armL: 0.35, armR: -0.35, tilt: -0.08 },
  pointing: { legL: 0.1, legR: -0.1, armL: 0.15, armR: -1.3, tilt: -0.05 },
  sliding: { legL: 1.15, legR: -0.35, armL: -0.55, armR: 0.65, tilt: 0.18 },
};

function SpriteLimb({ pivot, angle, length, radius, color }: { pivot: [number, number]; angle: number; length: number; radius: number; color: string }) {
  return (
    <group position={[pivot[0], pivot[1], 0]} rotation={[0, 0, angle]}>
      <mesh position={[0, -length / 2, 0]}>
        <capsuleGeometry args={[radius, Math.max(0.02, length - 2 * radius), 4, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function PlayerFigure({ color, pose = 'standing' }: { color: string; pose?: PlayerPose }) {
  const p = FLAT_POSES[pose] ?? FLAT_POSES.standing;
  return (
    <Billboard>
      <group rotation={[0, 0, p.tilt]}>
        <mesh position={[0, 1.56, 0.01]}>
          <circleGeometry args={[0.16, 20]} />
          <meshBasicMaterial color={SPRITE_SKIN} />
        </mesh>
        <mesh position={[0, 1.14, 0]}>
          <capsuleGeometry args={[0.22, 0.32, 4, 12]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh position={[0, 0.82, -0.005]}>
          <capsuleGeometry args={[0.19, 0.06, 4, 8]} />
          <meshBasicMaterial color={SPRITE_SHORTS} />
        </mesh>
        <SpriteLimb pivot={[-0.24, 1.28]} angle={p.armL} length={0.42} radius={0.075} color={color} />
        <SpriteLimb pivot={[0.24, 1.28]} angle={p.armR} length={0.42} radius={0.075} color={color} />
        <SpriteLimb pivot={[-0.12, 0.78]} angle={p.legL} length={0.5} radius={0.09} color={SPRITE_LEG} />
        <SpriteLimb pivot={[0.12, 0.78]} angle={p.legR} length={0.5} radius={0.09} color={SPRITE_LEG} />
      </group>
    </Billboard>
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
  const postH = 1.25, span = 1.6, depth = 0.65;
  const net = useMemo(() => getNetTexture(), []);
  const netMat = { map: net, transparent: true, opacity: 0.85, side: THREE.DoubleSide, color: '#f8fafc' } as const;
  return (
    <group>
      {/* posts + crossbar */}
      <mesh position={[-span / 2, postH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.055, postH, 10]} />
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.1} />
      </mesh>
      <mesh position={[span / 2, postH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.055, postH, 10]} />
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.1} />
      </mesh>
      <mesh position={[0, postH, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.055, 0.055, span, 10]} />
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.1} />
      </mesh>
      {/* back support posts */}
      <mesh position={[-span / 2, postH * 0.3, -depth]}>
        <cylinderGeometry args={[0.035, 0.035, postH * 0.6, 8]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      <mesh position={[span / 2, postH * 0.3, -depth]}>
        <cylinderGeometry args={[0.035, 0.035, postH * 0.6, 8]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      {/* net cage: back, two sides, roof */}
      <mesh position={[0, postH / 2, -depth]}>
        <planeGeometry args={[span, postH]} />
        <meshStandardMaterial {...netMat} />
      </mesh>
      <mesh position={[-span / 2, postH / 2, -depth / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depth, postH]} />
        <meshStandardMaterial {...netMat} />
      </mesh>
      <mesh position={[span / 2, postH / 2, -depth / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depth, postH]} />
        <meshStandardMaterial {...netMat} />
      </mesh>
      <mesh position={[0, postH, -depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[span, depth]} />
        <meshStandardMaterial {...netMat} />
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

const HIT_TARGET_SIZE: Record<string, { radius: number; height: number }> = {
  player: { radius: 0.6, height: 2.0 },
  mannequin: { radius: 0.6, height: 2.0 },
  pole: { radius: 0.5, height: 2.2 },
  miniGoal: { radius: 0.75, height: 1.3 },
  cone: { radius: 0.5, height: 0.9 },
  disc: { radius: 0.5, height: 0.4 },
  ball: { radius: 0.5, height: 0.5 },
  bench: { radius: 0.6, height: 0.6 },
};

export default function TokenMesh({ token, selected, locked, onPointerDown }: Props) {
  const [wx, , wz] = pctToWorld(token.x, token.y);
  const showLabel = token.kind === 'player' && token.label;
  const hit = HIT_TARGET_SIZE[token.kind] ?? { radius: 0.5, height: 1.0 };
  const lift = selected ? 0.06 : 0;

  return (
    <group
      position={[wx, lift, wz]}
      rotation={[0, THREE.MathUtils.degToRad(token.rotation || 0), 0]}
      onPointerDown={onPointerDown}
      onPointerOver={() => { if (!locked) document.body.style.cursor = 'grab'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* enlarged invisible hit target — easier to grab thin equipment (cones/poles/discs) without pixel-precise clicks */}
      <mesh position={[0, hit.height / 2, 0]}>
        <cylinderGeometry args={[hit.radius, hit.radius, hit.height, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {selected && (
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.68, 32]} />
          <meshBasicMaterial color={SELECT_COLOR} transparent opacity={0.9} />
        </mesh>
      )}

      {token.kind === 'player' && <PlayerFigure color={token.color} pose={token.pose} />}
      {token.kind === 'mannequin' && <PlayerFigure color={token.color} pose={token.pose} />}
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
