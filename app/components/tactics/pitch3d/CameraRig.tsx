'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

const PRESETS: Record<'vertical' | 'horizontal', { pos: [number, number, number] }> = {
  vertical: { pos: [0, 92, 66] },
  horizontal: { pos: [92, 66, 0] },
};

const MIN_POLAR = THREE.MathUtils.degToRad(18);
const MAX_POLAR = THREE.MathUtils.degToRad(78);
const MIN_DIST = 35;
const MAX_DIST = 170;

export interface CameraRigHandle {
  rotate: (deltaDeg: number) => void;
  tilt: (deltaDeg: number) => void;
  zoom: (factor: number) => void;
  reset: () => void;
}

interface Props {
  orientation: 'vertical' | 'horizontal';
}

const CameraRig = forwardRef<CameraRigHandle, Props>(function CameraRig({ orientation }, ref) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    const { pos } = PRESETS[orientation];
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(0, 0, 0);
    controlsRef.current?.target.set(0, 0, 0);
    controlsRef.current?.update();
  }, [orientation, camera]);

  useImperativeHandle(ref, () => ({
    rotate: (deltaDeg: number) => {
      const controls = controlsRef.current;
      if (!controls) return;
      const offset = camera.position.clone().sub(controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta += THREE.MathUtils.degToRad(deltaDeg);
      offset.setFromSpherical(spherical);
      camera.position.copy(controls.target).add(offset);
      controls.update();
    },
    tilt: (deltaDeg: number) => {
      const controls = controlsRef.current;
      if (!controls) return;
      const offset = camera.position.clone().sub(controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + THREE.MathUtils.degToRad(deltaDeg), MIN_POLAR, MAX_POLAR);
      offset.setFromSpherical(spherical);
      camera.position.copy(controls.target).add(offset);
      controls.update();
    },
    zoom: (factor: number) => {
      const controls = controlsRef.current;
      if (!controls) return;
      const offset = camera.position.clone().sub(controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.radius = THREE.MathUtils.clamp(spherical.radius * factor, MIN_DIST, MAX_DIST);
      offset.setFromSpherical(spherical);
      camera.position.copy(controls.target).add(offset);
      controls.update();
    },
    reset: () => {
      const { pos } = PRESETS[orientation];
      camera.position.set(pos[0], pos[1], pos[2]);
      controlsRef.current?.target.set(0, 0, 0);
      controlsRef.current?.update();
    },
  }), [camera, orientation]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableDamping={false}
      minPolarAngle={MIN_POLAR}
      maxPolarAngle={MAX_POLAR}
      minDistance={MIN_DIST}
      maxDistance={MAX_DIST}
      mouseButtons={{ LEFT: -1 as unknown as THREE.MOUSE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
      touches={{ ONE: -1 as unknown as THREE.TOUCH, TWO: THREE.TOUCH.DOLLY_ROTATE }}
    />
  );
});

export default CameraRig;
