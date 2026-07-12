'use client';

import { useMemo } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Html } from '@react-three/drei';
import { TBText } from '@/lib/tactics';
import { pctToWorld } from './coords';
import HandleSphere from './HandleSphere';
import { DragMode } from './useGroundDrag';

const TEXT_Y = 0.2;

interface Props {
  text: TBText;
  selected: boolean;
  locked: boolean;
  isEditing: boolean;
  onSelectPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onStartEdit: () => void;
  onChangeText: (v: string) => void;
  onBlur: () => void;
  beginDrag: (mode: DragMode, id: string) => void;
}

export default function TextLabel3D({
  text, selected, locked, isEditing, onSelectPointerDown, onStartEdit, onChangeText, onBlur, beginDrag,
}: Props) {
  const [wx, , wz] = pctToWorld(text.x, text.y);
  const [twx, , twz] = pctToWorld(text.tailX, text.tailY);

  const tailPositions = useMemo(
    () => new Float32Array([wx, TEXT_Y, wz, twx, TEXT_Y, twz]),
    [wx, wz, twx, twz],
  );

  return (
    <group>
      {text.kind === 'note' && (
        <>
          <line>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[tailPositions, 3]} />
            </bufferGeometry>
            <lineBasicMaterial color="#1f2937" />
          </line>
          {selected && !locked && (
            <HandleSphere position={[twx, TEXT_Y, twz]} radius={0.28}
              onPointerDown={() => beginDrag('noteTail', text.id)} />
          )}
        </>
      )}
      <Html position={[wx, TEXT_Y, wz]} center transform={false} occlude={false} zIndexRange={[10, 0]}>
        <div
          onPointerDown={e => { if (isEditing) return; e.stopPropagation(); onSelectPointerDown(e); }}
          onDoubleClick={onStartEdit}
          style={{
            padding: text.kind === 'note' ? '8px 12px' : '2px 6px',
            borderRadius: text.kind === 'note' ? 16 : 4,
            background: text.kind === 'note' ? 'rgba(226,232,240,0.96)' : 'transparent',
            border: selected ? '1.5px solid #38bdf8' : text.kind === 'note' ? '1px solid rgba(0,0,0,0.15)' : 'none',
            color: text.kind === 'note' ? '#111827' : text.color,
            fontWeight: text.bold ? 800 : 600,
            fontSize: text.fontSize,
            boxShadow: text.kind === 'note' ? '0 4px 14px rgba(0,0,0,0.25)' : 'none',
            maxWidth: 220, textAlign: 'center',
            cursor: locked ? 'default' : 'move', whiteSpace: 'pre-wrap',
            userSelect: 'none',
          }}
        >
          {isEditing ? (
            <textarea
              autoFocus rows={2}
              value={text.text}
              onChange={e => onChangeText(e.target.value)}
              onBlur={onBlur}
              onPointerDown={e => e.stopPropagation()}
              style={{ background: 'transparent', border: 'none', outline: 'none', resize: 'none', font: 'inherit', color: 'inherit', width: 140, textAlign: 'center' }}
            />
          ) : (text.text || 'ข้อความ')}
        </div>
      </Html>
    </group>
  );
}
