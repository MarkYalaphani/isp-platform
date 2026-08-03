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

// The model's bind pose is a literal T-pose (arms straight out horizontally,
// verified by walking the joint hierarchy — see rig_inspect.js). These are
// the exact bone-local delta quaternions that rotate each upper arm's WORLD
// orientation by ±90° about Z so it points straight down instead — computed
// as worldQuat(bone)^-1 * worldRotation * worldQuat(bone), not guessed.
// Applied as a base layer before any pose-specific delta below.
const ARM_DOWN_L = new THREE.Quaternion(-0.0000582, 0.0214006, -0.7067829, 0.7071068);
const ARM_DOWN_R = new THREE.Quaternion(-0.0000582, -0.0214006, 0.7067829, 0.7071068);

// Rotation deltas applied on top of the arms-down base pose. Legs/spine were
// already close to a natural standing pose in the bind data, so those axes
// weren't affected by the T-pose issue; arm deltas here are relative to the
// now-lowered arm and are an approximation, not verified against the rig.
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

// Jersey/shorts are added as real children of the spine_02 / pelvis bones
// (not world-space placeholders) so they track the body through every pose.
// DEBUG_FIT: swap in bright unmissable colors + axis helpers while tuning
// the local offset/scale against the actual rig — flip off once it fits.
const DEBUG_FIT = false;

export default function PlayerModel({ color, pose = 'standing' }: Props) {
  const gltf = useGLTF(MODEL_URL);
  const bonesRef = useRef<Record<string, THREE.Bone>>({});
  const bindRef = useRef<Record<string, THREE.Quaternion>>({});

  const clone = useMemo(() => SkeletonUtils.clone(gltf.scene) as THREE.Group, [gltf.scene]);

  const jersey = useMemo(() => new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 16, 12).scale(1, 1.35, 0.85),
    new THREE.MeshStandardMaterial({ roughness: 0.6 }),
  ), []);
  const shorts = useMemo(() => new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 16, 12).scale(1, 0.6, 0.9),
    new THREE.MeshStandardMaterial({ roughness: 0.6 }),
  ), []);

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

    const spine = bones['spine_02'];
    const pelvis = bones['pelvis'];
    jersey.position.set(0, 0, 0);
    shorts.position.set(0, 0, 0);
    spine?.add(jersey);
    pelvis?.add(shorts);
    let spineAxes: THREE.AxesHelper | undefined;
    let pelvisAxes: THREE.AxesHelper | undefined;
    if (DEBUG_FIT) {
      spineAxes = new THREE.AxesHelper(0.5);
      pelvisAxes = new THREE.AxesHelper(0.5);
      spine?.add(spineAxes);
      pelvis?.add(pelvisAxes);
    }
    return () => {
      spine?.remove(jersey);
      pelvis?.remove(shorts);
      if (spineAxes) spine?.remove(spineAxes);
      if (pelvisAxes) pelvis?.remove(pelvisAxes);
    };
  }, [clone, jersey, shorts]);

  useEffect(() => {
    const bones = bonesRef.current;
    const bind = bindRef.current;
    const deltas = POSE_BONES[pose] ?? {};
    (Object.keys(bones) as string[]).forEach(name => {
      const bone = bones[name];
      const bindQuat = bind[name];
      if (bindQuat) bone.quaternion.copy(bindQuat);
      if (name === 'upperarm_l') bone.quaternion.multiply(ARM_DOWN_L);
      if (name === 'upperarm_r') bone.quaternion.multiply(ARM_DOWN_R);
      const d = (deltas as Record<string, BoneDelta | undefined>)[name];
      if (d) {
        if (d.x) bone.rotateX(d.x);
        if (d.y) bone.rotateY(d.y);
        if (d.z) bone.rotateZ(d.z);
      }
    });
  }, [pose, clone]);

  useEffect(() => {
    (jersey.material as THREE.MeshStandardMaterial).color.set(DEBUG_FIT ? '#ff00ff' : color);
    (shorts.material as THREE.MeshStandardMaterial).color.set(DEBUG_FIT ? '#00ffff' : darken(color, 0.45));
  }, [color, jersey, shorts]);

  return (
    <group>
      <primitive object={clone} />
      {DEBUG_FIT && <axesHelper args={[1]} />}
    </group>
  );
}
