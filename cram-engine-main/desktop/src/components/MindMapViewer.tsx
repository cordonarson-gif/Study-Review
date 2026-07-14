/**
 * MindMapViewer — 思维导图可视化组件
 *
 * Phase 3 / OpenMAIC: 将 AI 生成的树形知识点结构渲染为交互式思维导图。
 */

import { useState } from 'react';
import type { MindMapNode } from '../lib/types';

type Props = {
  root: MindMapNode;
  title?: string;
};

const nodeColors = [
  '#5e39e0', '#00687a', '#8f4a00', '#1a6b3c',
  '#ba1a1a', '#6b3fa0', '#0d5e8a', '#7a4d1a'
];

function MindMapBranch({ node, depth = 0 }: { node: MindMapNode; depth?: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const color = node.color || nodeColors[depth % nodeColors.length];

  return (
    <div style={{ marginLeft: depth > 0 ? '20px' : '0', position: 'relative' }}>
      {/* 连接线 */}
      {depth > 0 && (
        <div style={{
          position: 'absolute',
          left: '-12px',
          top: '14px',
          width: '12px',
          height: '2px',
          background: color,
          opacity: 0.3
        }} />
      )}

      {/* 节点 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          marginBottom: node.children.length > 0 ? '4px' : '0',
          borderRadius: '6px',
          background: `${color}10`,
          border: `1px solid ${color}30`,
          cursor: node.children.length > 0 ? 'pointer' : 'default',
          fontSize: '13px',
          fontWeight: depth === 0 ? 700 : 500
        }}
        onClick={() => node.children.length > 0 && setCollapsed(!collapsed)}
      >
        {node.children.length > 0 && (
          <span style={{ fontSize: '10px', color }}>
            {collapsed ? '▶' : '▼'}
          </span>
        )}
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: color,
          flexShrink: 0
        }} />
        <span>{node.label}</span>
        {node.children.length > 0 && (
          <span style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)', marginLeft: '4px' }}>
            ({node.children.length})
          </span>
        )}
      </div>

      {/* 子节点 */}
      {!collapsed && node.children.map((child) => (
        <MindMapBranch key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function MindMapViewer({ root, title }: Props) {
  return (
    <div className="mind-map-viewer">
      {title && (
        <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '12px', color: 'var(--color-primary)' }}>
          🧠 {title}
        </div>
      )}
      <div style={{
        padding: '16px',
        background: '#fff',
        border: '1px solid var(--color-outline-variant)',
        borderRadius: '12px',
        overflow: 'auto',
        maxHeight: '400px'
      }}>
        <MindMapBranch node={root} />
      </div>
    </div>
  );
}

/** 从议题文本生成简单的思维导图结构 */
export function parseMindMapFromText(topic: string, points: string[]): MindMapNode {
  const id = `mm-${Date.now()}`;
  return {
    id,
    label: `💡 ${topic}`,
    color: '#5e39e0',
    children: points.map((p, i) => ({
      id: `${id}-${i}`,
      label: p,
      children: [],
    }))
  };
}
