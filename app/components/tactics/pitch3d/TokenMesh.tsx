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
import { POSES, LimbPose } from './playerPoses';

interface Props {
  token: TBToken;
  selected: boolean;
  locked: boolean;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
}

const ARM_R = 0.085;
const LEG_R = 0.115;

function Limb({ pose, radius, color }: { pose: LimbPose; radius: number; color: string }) {
  const height = Math.max(0.05, pose.length - 2 * radius);
  return (
    <group position={pose.pivot} rotation={pose.rotation}>
      <mesh position={[0, -pose.length / 2, 0]} castShadow>
        <capsuleGeometry args={[radius, height, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
    </group>
  );
}

function PlayerFigure({ color, pose = 'standing' }: { color: string; pose?: PlayerPose }) {
  const t = POSES[pose];
  return (
    <group rotation={t.groupRotation} position={t.groupOffset}>
      <mesh position={t.torso.position} rotation={t.torso.rotation} castShadow>
        <capsuleGeometry args={[0.23, 0.34, 4, 12]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <mesh position={t.head.position} castShadow>
        <sphereGeometry args={[0.19, 16, 16]} />
        <meshStandardMaterial color="#f2c9a0" roughness={0.6} />
      </mesh>
      <Limb pose={t.armL} radius={ARM_R} color={color} />
      <Limb pose={t.armR} radius={ARM_R} color={color} />
      <Limb pose={t.legL} radius={LEG_R} color="#1f2937" />
      <Limb pose={t.legR} radius={LEG_R} color="#1f2937" />
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
