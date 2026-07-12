'use client';

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import type { ThreeEvent, RootState } from '@react-three/fiber';
import {
  TBFrame, TBToken, TBArrow, TBShape, TBText, TokenKind, LineStyle, ArrowShape,
} from '@/lib/tactics';
import { worldToPct } from './pitch3d/coords';
import { screenToPct } from './pitch3d/raycast';
import { useGroundDrag, DragState } from './pitch3d/useGroundDrag';
import PitchSurface from './pitch3d/PitchSurface';
import CameraRig from './pitch3d/CameraRig';
import TokenMesh from './pitch3d/TokenMesh';
import ArrowMesh from './pitch3d/ArrowMesh';
import ShapeMesh from './pitch3d/ShapeMesh';
import TextLabel3D from './pitch3d/TextLabel3D';

export type DrawTool =
  | 'select'
  | `arrow-${ArrowShape}` | 'rect' | 'circle' | 'text' | 'note';

export type Selection = { kind: 'token' | 'arrow' | 'shape' | 'text'; id: string } | null;

export interface TacticsPitch3DHandle {
  captureImage: () => string;
}

interface Props {
  frame: TBFrame;
  orientation: 'vertical' | 'horizontal';
  tool: DrawTool;
  activeColor: string;
  activeLineStyle: LineStyle;
  arrowHead: boolean;
  locked: boolean;
  selected: Selection;
  onSelect: (s: Selection) => void;
  onChange: (updater: (f: TBFrame) => TBFrame) => void;
  transparency: number;
}

interface DragPayload { kind: TokenKind; color: string; label: string; }
type Pct = { x: number; y: number };
type Draft = { from: Pct; to: Pct } | null;

interface RendererApi { gl: THREE.WebGLRenderer; camera: THREE.Camera; scene: THREE.Scene; }

function DraftPreview({
  draft, tool, activeColor, activeLineStyle, arrowHead,
}: { draft: NonNullable<Draft>; tool: DrawTool; activeColor: string; activeLineStyle: LineStyle; arrowHead: boolean }) {
  const noop = () => {};
  if (tool.startsWith('arrow-')) {
    const shape = tool.replace('arrow-', '') as ArrowShape;
    const fakeArrow: TBArrow = {
      id: '__draft__', shape, lineStyle: activeLineStyle, color: activeColor,
      from: draft.from, to: draft.to, bend: 8, head: arrowHead, label: '',
    };
    return <ArrowMesh arrow={fakeArrow} selected={false} locked onSelectPointerDown={noop} beginDrag={noop} />;
  }
  if (tool === 'rect' || tool === 'circle') {
    const fakeShape: TBShape = {
      id: '__draft__', kind: tool, x: draft.from.x, y: draft.from.y,
      w: draft.to.x - draft.from.x, h: draft.to.y - draft.from.y, color: activeColor, opacity: 0.3,
    };
    return <ShapeMesh shape={fakeShape} selected={false} locked transparency={0.3} onSelect={noop} beginDrag={noop} />;
  }
  return null;
}

function SceneContent({
  frame, orientation, tool, activeColor, activeLineStyle, arrowHead, locked,
  selected, onSelect, onChange, transparency,
}: Props) {
  const [draft, setDraft] = useState<Draft>(null);
  const [editingText, setEditingText] = useState<string | null>(null);

  const onDragMove = useCallback((pct: Pct, drag: DragState) => {
    if (drag.mode === 'draft') {
      setDraft(d => d ? { ...d, to: pct } : d);
      return;
    }
    if (drag.mode === 'token') {
      onChange(f => ({ ...f, tokens: f.tokens.map(t => t.id === drag.id ? { ...t, x: pct.x, y: pct.y } : t) }));
    } else if (drag.mode === 'arrowStart' || drag.mode === 'arrowEnd') {
      onChange(f => ({ ...f, arrows: f.arrows.map(a => a.id === drag.id
        ? { ...a, [drag.mode === 'arrowStart' ? 'from' : 'to']: pct } : a) }));
    } else if (drag.mode === 'arrowBend') {
      onChange(f => ({ ...f, arrows: f.arrows.map(a => {
        if (a.id !== drag.id) return a;
        const dx = a.to.x - a.from.x, dy = a.to.y - a.from.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const mx = (a.from.x + a.to.x) / 2, my = (a.from.y + a.to.y) / 2;
        const bend = (pct.x - mx) * nx + (pct.y - my) * ny;
        return { ...a, bend };
      }) }));
    } else if (drag.mode === 'shapeMove') {
      onChange(f => ({ ...f, shapes: f.shapes.map(s => s.id === drag.id
        ? { ...s, x: pct.x - (drag.offX ?? 0), y: pct.y - (drag.offY ?? 0) } : s) }));
    } else if (drag.mode === 'shapeResize') {
      onChange(f => ({ ...f, shapes: f.shapes.map(s => s.id === drag.id ? { ...s, w: pct.x - s.x, h: pct.y - s.y } : s) }));
    } else if (drag.mode === 'textMove') {
      onChange(f => ({ ...f, texts: f.texts.map(t => t.id === drag.id ? { ...t, x: pct.x, y: pct.y } : t) }));
    } else if (drag.mode === 'noteTail') {
      onChange(f => ({ ...f, texts: f.texts.map(t => t.id === drag.id ? { ...t, tailX: pct.x, tailY: pct.y } : t) }));
    }
  }, [onChange]);

  const onDragEnd = useCallback((drag: DragState) => {
    if (drag.mode !== 'draft') return;
    setDraft(d => {
      if (!d) return null;
      const dist = Math.hypot(d.to.x - d.from.x, d.to.y - d.from.y);
      if (dist < 1.2) return null;
      if (tool.startsWith('arrow-')) {
        const shape = tool.replace('arrow-', '') as ArrowShape;
        const arrow: TBArrow = { id: crypto.randomUUID(), shape, lineStyle: activeLineStyle, color: activeColor, from: d.from, to: d.to, bend: 8, head: arrowHead, label: '' };
        onChange(f => ({ ...f, arrows: [...f.arrows, arrow] }));
        onSelect({ kind: 'arrow', id: arrow.id });
      } else if (tool === 'rect' || tool === 'circle') {
        const shape: TBShape = { id: crypto.randomUUID(), kind: tool, x: d.from.x, y: d.from.y, w: d.to.x - d.from.x, h: d.to.y - d.from.y, color: activeColor, opacity: 0.35 };
        onChange(f => ({ ...f, shapes: [...f.shapes, shape] }));
        onSelect({ kind: 'shape', id: shape.id });
      }
      return null;
    });
  }, [tool, activeColor, activeLineStyle, arrowHead, onChange, onSelect]);

  const { beginDrag } = useGroundDrag(onDragMove, onDragEnd);

  const handleGroundPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (locked) return;
    const pct = worldToPct(e.point.x, e.point.z);
    if (tool.startsWith('arrow-') || tool === 'rect' || tool === 'circle') {
      setDraft({ from: pct, to: pct });
      beginDrag('draft', '');
      return;
    }
    if (tool === 'text' || tool === 'note') {
      const text: TBText = {
        id: crypto.randomUUID(), kind: tool === 'note' ? 'note' : 'label',
        x: pct.x, y: pct.y, tailX: pct.x + 8, tailY: pct.y + 8,
        text: '', color: activeColor, fontSize: 13, bold: false,
      };
      onChange(f => ({ ...f, texts: [...f.texts, text] }));
      onSelect({ kind: 'text', id: text.id });
      setEditingText(text.id);
      return;
    }
    onSelect(null);
  }, [locked, tool, activeColor, onChange, onSelect, beginDrag]);

  const startTokenDrag = useCallback((e: ThreeEvent<PointerEvent>, id: string) => {
    e.stopPropagation();
    onSelect({ kind: 'token', id });
    if (locked) return;
    beginDrag('token', id);
  }, [locked, onSelect, beginDrag]);

  return (
    <>
      <color attach="background" args={['#0b1220']} />
      <fog attach="fog" args={['#0b1220', 90, 230]} />
      <CameraRig orientation={orientation} />
      <PitchSurface onGroundPointerDown={handleGroundPointerDown} />

      {frame.shapes.map(s => (
        <ShapeMesh key={s.id} shape={s} locked={locked} transparency={transparency}
          selected={selected?.kind === 'shape' && selected.id === s.id}
          onSelect={() => onSelect({ kind: 'shape', id: s.id })}
          beginDrag={beginDrag} />
      ))}

      {frame.arrows.map(a => (
        <ArrowMesh key={a.id} arrow={a} locked={locked}
          selected={selected?.kind === 'arrow' && selected.id === a.id}
          onSelectPointerDown={() => onSelect({ kind: 'arrow', id: a.id })}
          beginDrag={beginDrag} />
      ))}

      {frame.tokens.map(t => (
        <TokenMesh key={t.id} token={t} locked={locked}
          selected={selected?.kind === 'token' && selected.id === t.id}
          onPointerDown={e => startTokenDrag(e, t.id)} />
      ))}

      {frame.texts.map(t => (
        <TextLabel3D key={t.id} text={t} locked={locked}
          selected={selected?.kind === 'text' && selected.id === t.id}
          isEditing={editingText === t.id}
          onSelectPointerDown={e => {
            e.stopPropagation();
            onSelect({ kind: 'text', id: t.id });
            if (!locked) beginDrag('textMove', t.id);
          }}
          onStartEdit={() => setEditingText(t.id)}
          onChangeText={v => onChange(f => ({ ...f, texts: f.texts.map(x => x.id === t.id ? { ...x, text: v } : x) }))}
          onBlur={() => {
            setEditingText(null);
            if (!t.text.trim()) onChange(f => ({ ...f, texts: f.texts.filter(x => x.id !== t.id) }));
          }}
          beginDrag={beginDrag} />
      ))}

      {draft && <DraftPreview draft={draft} tool={tool} activeColor={activeColor} activeLineStyle={activeLineStyle} arrowHead={arrowHead} />}
    </>
  );
}

const TacticsPitch3D = forwardRef<TacticsPitch3DHandle, Props>(function TacticsPitch3D(props, ref) {
  const { locked, orientation, onChange, onSelect } = props;
  const apiRef = useRef<RendererApi | null>(null);

  useImperativeHandle(ref, () => ({
    captureImage: () => {
      const api = apiRef.current;
      if (!api) return '';
      api.gl.render(api.scene, api.camera);
      return api.gl.domElement.toDataURL('image/png');
    },
  }), []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (locked) return;
    const raw = e.dataTransfer.getData('application/tb-token');
    if (!raw) return;
    const api = apiRef.current;
    if (!api) return;
    const payload = JSON.parse(raw) as DragPayload;
    const pct = screenToPct(e.clientX, e.clientY, api.camera, api.gl.domElement);
    if (!pct) return;
    const token: TBToken = { id: crypto.randomUUID(), kind: payload.kind, x: pct.x, y: pct.y, color: payload.color, label: payload.label, rotation: 0, pose: 'standing' };
    onChange(f => ({ ...f, tokens: [...f.tokens, token] }));
    onSelect({ kind: 'token', id: token.id });
  };

  return (
    <div
      className="pitch-3d"
      style={{
        position: 'relative', width: '100%',
        aspectRatio: orientation === 'vertical' ? '0.68' : '1.54',
        borderRadius: 14, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
      }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ fov: 45, near: 0.5, far: 500 }}
        onCreated={(state: RootState) => { apiRef.current = { gl: state.gl, camera: state.camera, scene: state.scene }; }}
      >
        <SceneContent {...props} />
      </Canvas>
    </div>
  );
});

export default TacticsPitch3D;
