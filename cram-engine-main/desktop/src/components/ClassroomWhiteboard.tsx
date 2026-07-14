/**
 * ClassroomWhiteboard — 协作式实时白板
 *
 * Phase 4 / OpenMAIC: 可绘制基础图形、文本和自由线条的白板组件。
 * 支持 AI 分步绘制动画、导出为图片。
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { WhiteboardElement } from '../lib/types';

type Props = {
  width?: number;
  height?: number;
  /** 外部传入的元素（如 AI 生成的绘图指令） */
  externalElements?: WhiteboardElement[];
  /** 是否显示 AI 自动演示 */
  autoPlay?: boolean;
};

const colors = ['#000', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#f39c12'];

export default function ClassroomWhiteboard({ width = 600, height = 400, externalElements = [], autoPlay = false }: Props) {
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [tool, setTool] = useState<'pen' | 'rect' | 'circle' | 'arrow' | 'text' | 'erase'>('pen');
  const [color, setColor] = useState('#000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPos, setTextPos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [aiIndex, setAiIndex] = useState(0);

  // AI 逐步绘制动画
  useEffect(() => {
    if (!autoPlay || externalElements.length === 0) return;
    const timer = setInterval(() => {
      setAiIndex(i => {
        if (i >= externalElements.length) return i;
        return i + 1;
      });
    }, 600);
    return () => clearInterval(timer);
  }, [autoPlay, externalElements.length]);

  // 同步外部元素
  useEffect(() => {
    if (externalElements.length > 0 && !autoPlay) {
      setElements(prev => [...prev, ...externalElements]);
    }
  }, [externalElements]);

  const getCanvasPos = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  function handleMouseDown(e: React.MouseEvent) {
    if (tool === 'text') {
      const pos = getCanvasPos(e);
      setTextPos(pos);
      setShowTextInput(true);
      return;
    }
    const pos = getCanvasPos(e);
    setDraft(pos);
    setIsDrawing(true);

    if (tool === 'pen') {
      setElements(prev => [...prev, {
        id: `el-${Date.now()}`, type: 'freehand',
        x: pos.x, y: pos.y, endX: pos.x, endY: pos.y, color, strokeWidth: 2
      }]);
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDrawing || !draft) return;
    const pos = getCanvasPos(e);

    if (tool === 'pen') {
      setElements(prev => {
        const last = prev[prev.length - 1];
        if (!last || last.type !== 'freehand') return prev;
        return [...prev.slice(0, -1), { ...last, endX: pos.x, endY: pos.y }];
      });
    }
  }

  function handleMouseUp(e: React.MouseEvent) {
    if (!isDrawing || !draft) return;
    const pos = getCanvasPos(e);
    const id = `el-${Date.now()}`;
    let el: WhiteboardElement;

    switch (tool) {
      case 'rect':
        el = { id, type: 'rect', x: Math.min(draft.x, pos.x), y: Math.min(draft.y, pos.y), width: Math.abs(pos.x - draft.x), height: Math.abs(pos.y - draft.y), color, strokeWidth: 2 };
        break;
      case 'circle':
        el = { id, type: 'circle', x: Math.min(draft.x, pos.x), y: Math.min(draft.y, pos.y), width: Math.abs(pos.x - draft.x), height: Math.abs(pos.y - draft.y), color, strokeWidth: 2 };
        break;
      case 'arrow':
        el = { id, type: 'arrow', x: draft.x, y: draft.y, endX: pos.x, endY: pos.y, color, strokeWidth: 2 };
        break;
      default:
        el = { id, type: 'rect', x: draft.x, y: draft.y, width: pos.x - draft.x, height: pos.y - draft.y, color, strokeWidth: 2 };
    }

    if (tool !== 'pen') setElements(prev => [...prev, el]);
    setIsDrawing(false);
    setDraft(null);
  }

  function handleAddText() {
    if (!textInput.trim()) return;
    setElements(prev => [...prev, {
      id: `el-${Date.now()}`, type: 'text',
      x: textPos.x, y: textPos.y, text: textInput, color, strokeWidth: 1
    }]);
    setShowTextInput(false);
    setTextInput('');
  }

  function clearBoard() { setElements([]); setAiIndex(0); }

  function exportImage() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#fff"/>
      ${elements.map(el => renderSvg(el)).join('\n')}
    </svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    window.open(url);
  }

  function renderSvg(el: WhiteboardElement): string {
    switch (el.type) {
      case 'line': return `<line x1="${el.x}" y1="${el.y}" x2="${el.endX}" y2="${el.endY}" stroke="${el.color}" stroke-width="${el.strokeWidth}"/>`;
      case 'rect': return `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="none" stroke="${el.color}" stroke-width="${el.strokeWidth}"/>`;
      case 'circle': return `<ellipse cx="${el.x + (el.width||0)/2}" cy="${el.y + (el.height||0)/2}" rx="${(el.width||0)/2}" ry="${(el.height||0)/2}" fill="none" stroke="${el.color}" stroke-width="${el.strokeWidth}"/>`;
      case 'arrow': return `<line x1="${el.x}" y1="${el.y}" x2="${el.endX}" y2="${el.endY}" stroke="${el.color}" stroke-width="${el.strokeWidth}" marker-end="url(#arrow)"/>`;
      case 'text': return `<text x="${el.x}" y="${el.y}" fill="${el.color}" font-size="14">${el.text}</text>`;
      case 'freehand': return `<line x1="${el.x}" y1="${el.y}" x2="${el.endX}" y2="${el.endY}" stroke="${el.color}" stroke-width="3" stroke-linecap="round"/>`;
    }
  }

  // 包含 AI 逐步绘制的元素
  const shownElements = autoPlay ? externalElements.slice(0, aiIndex) : elements;

  return (
    <div className="whiteboard" style={{ position: 'relative' }}>
      {/* 工具栏 */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {(['pen', 'rect', 'circle', 'arrow', 'text', 'erase'] as const).map(t => (
          <button key={t} onClick={() => setTool(t)}
            className={tool === t ? 'active-tab' : ''} style={{ fontSize: '11px', padding: '4px 10px' }}>
            {t === 'pen' ? '✏️' : t === 'rect' ? '⬜' : t === 'circle' ? '⭕' : t === 'arrow' ? '➡️' : t === 'text' ? '📝' : '🧹'}
          </button>
        ))}
        <div style={{ display: 'flex', gap: '3px', marginLeft: '8px' }}>
          {colors.map(c => (
            <div key={c} onClick={() => setColor(c)} style={{
              width: '18px', height: '18px', borderRadius: '50%', background: c, cursor: 'pointer',
              border: color === c ? '2px solid var(--color-primary)' : '1px solid #ccc'
            }} />
          ))}
        </div>
        <button onClick={clearBoard} style={{ fontSize: '11px', marginLeft: 'auto' }}>🗑️ 清空</button>
        <button onClick={exportImage} style={{ fontSize: '11px' }}>📥 导出</button>
      </div>

      {/* 画布 */}
      <div ref={canvasRef} style={{
        width, height, border: '1px solid var(--color-outline-variant)',
        borderRadius: '8px', background: '#fff', position: 'relative',
        cursor: tool === 'text' ? 'text' : 'crosshair', overflow: 'hidden'
      }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setIsDrawing(false); setDraft(null); }}
      >
        {/* 渲染元素 */}
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
          <defs><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs>
          {shownElements.map(el => (
            <g key={el.id}>
              {el.type === 'line' && <line x1={el.x} y1={el.y} x2={el.endX} y2={el.endY} stroke={el.color} strokeWidth={el.strokeWidth} />}
              {el.type === 'rect' && <rect x={el.x} y={el.y} width={el.width} height={el.height} fill="none" stroke={el.color} strokeWidth={el.strokeWidth} />}
              {el.type === 'circle' && <ellipse cx={el.x + (el.width || 0) / 2} cy={el.y + (el.height || 0) / 2} rx={(el.width || 0) / 2} ry={(el.height || 0) / 2} fill="none" stroke={el.color} strokeWidth={el.strokeWidth} />}
              {el.type === 'arrow' && <line x1={el.x} y1={el.y} x2={el.endX} y2={el.endY} stroke={el.color} strokeWidth={el.strokeWidth} markerEnd="url(#arrow)" />}
              {el.type === 'text' && <text x={el.x} y={el.y + 14} fill={el.color} fontSize="14" fontFamily="sans-serif">{el.text}</text>}
              {el.type === 'freehand' && <line x1={el.x} y1={el.y} x2={el.endX} y2={el.endY} stroke={el.color} strokeWidth="3" strokeLinecap="round" />}
            </g>
          ))}
        </svg>

        {/* 文字输入弹窗 */}
        {showTextInput && (
          <div style={{ position: 'absolute', left: textPos.x, top: textPos.y, zIndex: 50, display: 'flex', gap: '4px', background: '#fff', padding: '4px', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
            <input autoFocus value={textInput} onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddText(); if (e.key === 'Escape') setShowTextInput(false); }}
              style={{ fontSize: '14px', padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px', width: '120px' }} />
            <button onClick={handleAddText} style={{ fontSize: '12px', padding: '4px 8px' }}>OK</button>
          </div>
        )}

        {/* 空画布提示 */}
        {shownElements.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '14px', pointerEvents: 'none' }}>
            ✏️ 选择工具开始绘制
          </div>
        )}
      </div>
    </div>
  );
}
