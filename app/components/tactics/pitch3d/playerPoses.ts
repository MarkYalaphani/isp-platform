import type { PlayerPose } from '@/lib/tactics';

export type Vec3 = [number, number, number];

export interface LimbPose { pivot: Vec3; rotation: Vec3; length: number; }
export interface PoseTransform {
  torso: { position: Vec3; rotation: Vec3 };
  head: { position: Vec3 };
  armL: LimbPose; armR: LimbPose;
  legL: LimbPose; legR: LimbPose;
  groupRotation: Vec3;
  groupOffset: Vec3;
}

const ARM_LEN = 0.46;
const LEG_LEN = 0.56;

export const POSES: Record<PlayerPose, PoseTransform> = {
  standing: {
    torso: { position: [0, 1.08, 0], rotation: [0, 0, 0] },
    head: { position: [0, 1.58, 0] },
    armL: { pivot: [-0.27, 1.32, 0], rotation: [0, 0, 0.18], length: ARM_LEN },
    armR: { pivot: [0.27, 1.32, 0], rotation: [0, 0, -0.18], length: ARM_LEN },
    legL: { pivot: [-0.13, 0.84, 0], rotation: [0, 0, 0.05], length: LEG_LEN },
    legR: { pivot: [0.13, 0.84, 0], rotation: [0, 0, -0.05], length: LEG_LEN },
    groupRotation: [0, 0, 0],
    groupOffset: [0, 0, 0],
  },
  running: {
    torso: { position: [0, 1.06, 0.02], rotation: [0.22, 0, 0] },
    head: { position: [0, 1.55, -0.05] },
    armL: { pivot: [-0.27, 1.3, 0], rotation: [0.75, 0, 0.1], length: ARM_LEN },
    armR: { pivot: [0.27, 1.3, 0], rotation: [-0.65, 0, -0.1], length: ARM_LEN },
    legL: { pivot: [-0.13, 0.86, 0], rotation: [-0.85, 0, 0], length: LEG_LEN },
    legR: { pivot: [0.13, 0.86, 0], rotation: [0.6, 0, 0], length: LEG_LEN },
    groupRotation: [0, 0, 0],
    groupOffset: [0, 0, 0],
  },
  dribbling: {
    torso: { position: [0, 0.98, 0.02], rotation: [0.32, 0, 0] },
    head: { position: [0, 1.45, -0.08] },
    armL: { pivot: [-0.28, 1.2, 0], rotation: [0.15, 0, 0.55], length: ARM_LEN },
    armR: { pivot: [0.28, 1.2, 0], rotation: [0.15, 0, -0.55], length: ARM_LEN },
    legL: { pivot: [-0.14, 0.78, 0], rotation: [-0.45, 0, 0], length: LEG_LEN },
    legR: { pivot: [0.14, 0.78, 0], rotation: [0.35, 0, 0], length: LEG_LEN },
    groupRotation: [0, 0, 0],
    groupOffset: [0, -0.06, 0],
  },
  pointing: {
    torso: { position: [0, 1.08, 0], rotation: [0.05, 0, -0.05] },
    head: { position: [0, 1.58, 0] },
    armL: { pivot: [-0.27, 1.32, 0], rotation: [0, 0, 0.16], length: ARM_LEN },
    armR: { pivot: [0.27, 1.32, 0], rotation: [-1.35, 0, -0.35], length: ARM_LEN },
    legL: { pivot: [-0.13, 0.84, 0], rotation: [0, 0, 0.05], length: LEG_LEN },
    legR: { pivot: [0.13, 0.84, 0], rotation: [0, 0, -0.05], length: LEG_LEN },
    groupRotation: [0, 0, 0],
    groupOffset: [0, 0, 0],
  },
  sliding: {
    torso: { position: [0, 1.08, 0], rotation: [0, 0, 0] },
    head: { position: [0, 1.56, 0.1] },
    armL: { pivot: [-0.27, 1.3, 0], rotation: [-0.9, 0, 0.3], length: ARM_LEN },
    armR: { pivot: [0.27, 1.3, 0], rotation: [-1.1, 0, -0.3], length: ARM_LEN },
    legL: { pivot: [-0.13, 0.84, 0], rotation: [1.15, 0, 0], length: LEG_LEN + 0.1 },
    legR: { pivot: [0.13, 0.84, 0], rotation: [-0.35, 0, 0], length: LEG_LEN },
    groupRotation: [1.35, 0, 0],
    groupOffset: [0, -0.78, 0.25],
  },
};
