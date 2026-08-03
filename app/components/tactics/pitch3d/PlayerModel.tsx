'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import { PlayerPose } from '@/lib/tactics';

const MODEL_URL = '/models/player/Superhero_Male_FullBody.gltf';

interface BoneDelta { x?: number; y?: number; z?: number; }
type PoseBones = Partial<Record<
  'spine_01' | 'spine_02' | 'spine_03' | 'neck_01' |
  'upperarm_l' | 'upperarm_r' | 'lowerarm_l' | 'lowerarm_r' |
  'thigh_l' | 'thigh_r' | 'calf_l' | 'calf_r',
  BoneDelta
>>;

// Rotation deltas applied on top of the model's bind pose (a relaxed standing
// pose already, not a T-pose) — signs mirror the existing capsule POSES in
// playerPoses.ts. Approximate; not visually tuned against the real rig.
const POSE_BONES: Record<PlayerPose, PoseBones> = {
  standing: {},
  running: {
    spine_01: { x: -0.25 },
    thigh_l: { x: 0.55 }, thigh_r: { x: -0.75 },
    calf_l: { x: -0.3 }, calf_r: { x: 0.5 },
    upperarm_l: { x: 0.6 }, upperarm_r: { x: -0.7 },
  },
  dribbling: {
    spine_01: { x: -0.35 },
    thigh_l: { x: 0.35 }, thigh_r: { x: 0.5 },
    calf_l: { x: -0.4 }, calf_r: { x: -0.6 },
    upperarm_l: { x: 0.2, z: 0.3 }, upperarm_r: { x: 0.2, z: -0.3 },
  },
  pointing: {
    spine_01: { x: -0.05 },
    upperarm_r: { x: -1.2, z: -0.3 },
    lowerarm_r: { x: -0.2 },
  },
  sliding: {
    spine_01: { x: 0.3 }, spine_02: { x: 0.15 },
    thigh_l: { x: -0.9 }, thigh_r: { x: 0.5 },
    calf_l: { x: 0.2 }, calf_r: { x: -0.7 },
    upperarm_l: { x: 0.5 }, upperarm_r: { x: 0.7 },
  },
};

// World-space torso placement per pose — decoupled from the skeleton so the
// jersey/shorts overlay stays correctly oriented regardless of bone-local axes.
const TORSO_PLACEMENT: Record<PlayerPose, { y: number; tiltX: number }> = {
  standing: { y: 1.08, tiltX: 0 },
  running: { y: 1.06, tiltX: 0.22 },
  dribbling: { y: 0.98, tiltX: 0.32 },
  pointing: { y: 1.08, tiltX: 0.05 },
  sliding: { y: 0.65, tiltX: 1.1 },
};

useGLTF.preload(MODEL_URL);

function darken(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(1 - amount);
  return `#${c.getHexString()}`;
}

interface Props {
  color: string;
  pose?: PlayerPose;
}

export default function PlayerModel({ color, pose = 'standing' }: Props) {
  const gltf = useGLTF(MODEL_URL);
  const bonesRef = useRef<Record<string, THREE.Bone>>({});
  const bindRef = useRef<Record<string, THREE.Quaternion>>({});
  const jerseyMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const shortsMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const clone = useMemo(() => SkeletonUtils.clone(gltf.scene) as THREE.Group, [gltf.scene]);

  useEffect(() => {
    const bones: Record<string, THREE.Bone> = {};
    const bind: Record<string, THREE.Quaternion> = {};
    clone.traverse(obj => {
      const b = obj as THREE.Bone;
      if ((b as THREE.Object3D).type === 'Bone') {
        bones[b.name] = b;
        bind[b.name] = b.quaternion.clone();
      }
      const mesh = obj as THREE.Mesh;
      if ((mesh as THREE.Object3D).type === 'SkinnedMesh') {
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });
    bonesRef.current = bones;
    bindRef.current = bind;
  }, [clone]);

  useEffect(() => {
    const bones = bonesRef.current;
    const bind = bindRef.current;
    const deltas = POSE_BONES[pose] ?? {};
    (Object.keys(bones) as string[]).forEach(name => {
      const bone = bones[name];
      const bindQuat = bind[name];
      if (bindQuat) bone.quaternion.copy(bindQuat);
      const d = (deltas as Record<string, BoneDelta | undefined>)[name];
      if (d) {
        if (d.x) bone.rotateX(d.x);
        if (d.y) bone.rotateY(d.y);
        if (d.z) bone.rotateZ(d.z);
      }
    });
  }, [pose, clone]);

  useEffect(() => {
    jerseyMatRef.current?.color.set(color);
    shortsMatRef.current?.color.set(darken(color, 0.45));
  }, [color]);

  const placement = TORSO_PLACEMENT[pose] ?? TORSO_PLACEMENT.standing;

  return (
    <group>
      <primitive object={clone} />
      <mesh position={[0, placement.y, 0]} rotation={[placement.tiltX, 0, 0]}>
        <capsuleGeometry args={[0.27, 0.32, 4, 12]} />
        <meshStandardMaterial ref={jerseyMatRef} color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <capsuleGeometry args={[0.24, 0.14, 4, 12]} />
        <meshStandardMaterial ref={shortsMatRef} color={darken(color, 0.45)} roughness={0.6} />
      </mesh>
    </group>
  );
}
