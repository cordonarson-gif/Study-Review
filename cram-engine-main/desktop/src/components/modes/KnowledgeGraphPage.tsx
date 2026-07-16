import { useEffect, useMemo, useState } from 'react';
import type { KnowledgeBaseEntry, ModeArtifact, ReviewQuestion } from '../../lib/types';
import {
  buildKnowledgeGraph,
  layoutKnowledgeGraph,
  type KnowledgeGraphNodeType
} from '../../lib/advancedModeWorkspaces.js';

type KnowledgeGraphPageProps = {
  knowledgeBase: KnowledgeBaseEntry[];
  questions: ReviewQuestion[];
  artifacts: ModeArtifact[];
};

const graphWidth = 760;
const graphHeight = 440;
const typeLabels: Record<KnowledgeGraphNodeType, string> = {
  knowledge: '知识条目',
  tag: '标签',
  'knowledge-point': '知识点',
  question: '题目',
  artifact: '成果'
};

export function KnowledgeGraphPage({ knowledgeBase, questions, artifacts }: KnowledgeGraphPageProps) {
  const graph = useMemo(
    () => buildKnowledgeGraph({ knowledgeBase, questions, artifacts }),
    [knowledgeBase, questions, artifacts]
  );
  const availableTypes = useMemo(
    () => (Object.keys(typeLabels) as KnowledgeGraphNodeType[]).filter((type) => graph.nodes.some((node) => node.type === type)),
    [graph.nodes]
  );
  const [enabledTypes, setEnabledTypes] = useState<Set<KnowledgeGraphNodeType>>(() => new Set(Object.keys(typeLabels) as KnowledgeGraphNodeType[]));
  const [selectedId, setSelectedId] = useState('');
  const visibleNodes = useMemo(
    () => graph.nodes.filter((node) => enabledTypes.has(node.type)),
    [enabledTypes, graph.nodes]
  );

  const positioned = useMemo(() => {
    const nodeIds = new Set(visibleNodes.map((node) => node.id));
    return layoutKnowledgeGraph(
      { nodes: visibleNodes, edges: graph.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)) },
      graphWidth,
      graphHeight
    );
  }, [graph.edges, visibleNodes]);

  const nodeById = useMemo(() => new Map(positioned.nodes.map((node) => [node.id, node])), [positioned.nodes]);
  const selected = positioned.nodes.find((node) => node.id === selectedId) ?? positioned.nodes[0] ?? null;

  useEffect(() => {
    if (positioned.nodes.some((node) => node.id === selectedId)) return;
    setSelectedId(positioned.nodes[0]?.id ?? '');
  }, [positioned.nodes, selectedId]);

  const evidence = selected
    ? graph.edges
        .filter((edge) => edge.source === selected.id || edge.target === selected.id)
        .map((edge) => graph.nodes.find((node) => node.id === (edge.source === selected.id ? edge.target : edge.source)))
        .filter((node): node is NonNullable<typeof node> => Boolean(node))
    : [];

  function toggleType(type: KnowledgeGraphNodeType) {
    setEnabledTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  if (!graph.nodes.length) {
    return (
      <section className="panel specialized-mode-page knowledge-graph-page">
        <div className="page-section-header"><div><div className="section-title">知识关系</div><h3>知识图谱</h3></div></div>
        <div className="empty-slim">暂无可绘制的数据。导入素材、题目或生成成果后，节点会自动建立连接。</div>
      </section>
    );
  }

  return (
    <section className="panel specialized-mode-page knowledge-graph-page">
      <div className="page-section-header">
        <div><div className="section-title">知识关系</div><h3>知识图谱</h3><p className="muted">按来源筛选节点，并选择节点检查证据连接。</p></div>
      </div>

      <div className="graph-source-counters" aria-label="节点来源统计">
        {(Object.keys(typeLabels) as KnowledgeGraphNodeType[]).map((type) => (
          <div key={type}><span>{typeLabels[type]}</span><strong>{graph.nodes.filter((node) => node.type === type).length}</strong></div>
        ))}
      </div>

      <div className="graph-filter-row" aria-label="节点类型筛选">
        {availableTypes.map((type) => (
          <label key={type}><input type="checkbox" checked={enabledTypes.has(type)} onChange={() => toggleType(type)} />{typeLabels[type]}</label>
        ))}
      </div>

      <div className="knowledge-graph-layout">
        <div className="knowledge-graph-canvas">
          {positioned.nodes.length ? (
            <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} role="group" aria-label="知识图谱节点与连接">
              <g className="graph-edges">
                {positioned.edges.map((edge) => {
                  const source = nodeById.get(edge.source);
                  const target = nodeById.get(edge.target);
                  if (!source || !target) return null;
                  return <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} />;
                })}
              </g>
              <g className="graph-nodes">
                {positioned.nodes.map((node) => (
                  <g
                    key={node.id}
                    className={`graph-node graph-node-${node.type}${selected?.id === node.id ? ' selected' : ''}`}
                    transform={`translate(${node.x} ${node.y})`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${typeLabels[node.type]}：${node.label}`}
                    onClick={() => setSelectedId(node.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedId(node.id);
                      }
                    }}
                  >
                    <circle r="18" />
                    <text y="34" textAnchor="middle">{node.label.length > 12 ? `${node.label.slice(0, 12)}...` : node.label}</text>
                  </g>
                ))}
              </g>
            </svg>
          ) : <div className="empty-slim">当前筛选条件下没有节点。</div>}
        </div>

        <aside className="graph-detail-panel">
          {selected ? (
            <>
              <span className="upload-kind">{typeLabels[selected.type]}</span>
              <h4>{selected.label}</h4>
              <p>{selected.description || '该节点暂无补充描述。'}</p>
              {selected.sourceId && <small>来源 ID：{selected.sourceId}</small>}
              <div className="subsection-title">关联证据</div>
              {evidence.length ? (
                <ul>{evidence.map((node) => <li key={node.id}><strong>{node.label}</strong><span>{typeLabels[node.type]}</span></li>)}</ul>
              ) : <div className="empty-slim">暂无直接连接。</div>}
            </>
          ) : <div className="empty-slim">选择一个节点查看详情。</div>}
        </aside>
      </div>
    </section>
  );
}
