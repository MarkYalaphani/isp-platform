import * as THREE from 'three';
import { worldToPct } from './coords';

const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/** Projects a client-space (clientX, clientY) point onto the fixed y=0 pitch plane
 * and returns the corresponding 0-100% pct coordinate, or null if the ray is parallel
 * to the plane (camera looking edge-on — practically unreachable given our clamped
 * OrbitControls polar-angle range, but guarded regardless). */
export function screenToPct(
  clientX: number, clientY: number, camera: THREE.Camera, domElement: HTMLElement,
): { x: number; y: number } | null {
  const rect = domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(ndc, camera);
  const hit = new THREE.Vector3();
  const ok = raycaster.ray.intersectPlane(groundPlane, hit);
  if (!ok) return null;
  return worldToPct(hit.x, hit.z);
}
