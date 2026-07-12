'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { screenToPct } from './raycast';

export type DragMode =
  | 'token' | 'arrowEnd' | 'arrowStart' | 'arrowBend'
  | 'shapeMove' | 'shapeResize' | 'textMove' | 'noteTail' | 'draft';

export interface DragState { mode: DragMode; id: string; offX?: number; offY?: number; }

/**
 * Drag continuation is driven by window-level pointer listeners + a manual raycast
 * against a fixed y=0 plane, rather than trusting R3F's per-mesh pointer events —
 * a fast pointer can outrun a small token/handle's hit area mid-drag.
 */
export function useGroundDrag(
  onMove: (pct: { x: number; y: number }, drag: DragState) => void,
  onEnd?: (drag: DragState) => void,
) {
  const { camera, gl } = useThree();
  const dragRef = useRef<DragState | null>(null);

  const pointFromEvent = useCallback(
    (clientX: number, clientY: number) => screenToPct(clientX, clientY, camera, gl.domElement),
    [camera, gl],
  );

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const pct = pointFromEvent(e.clientX, e.clientY);
      if (pct) onMove(pct, drag);
    };
    const onPointerUp = () => {
      const drag = dragRef.current;
      if (drag) { dragRef.current = null; onEnd?.(drag); }
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [pointFromEvent, onMove, onEnd]);

  const beginDrag = useCallback((mode: DragMode, id: string, offX?: number, offY?: number) => {
    dragRef.current = { mode, id, offX, offY };
  }, []);

  const isDragging = useCallback(() => dragRef.current !== null, []);

  return { beginDrag, dragRef, pointFromEvent, isDragging };
}
