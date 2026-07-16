import { useMemo, useState } from 'react';
import type { GenerateModeArtifactInput, ModeArtifact } from '../../lib/types';
import {
  formatSimulationNumber,
  parseParameterSweepForm,
  runParameterSweep,
  type ParameterSweepInput,
  type ParameterSweepModel,
  type ParameterSweepPoint
} from '../../lib/advancedModeWorkspaces.js';

type SimulationWorkbenchPageProps = {
  onGenerate: (input: GenerateModeArtifactInput) => Promise<ModeArtifact[]>;
  onChange: (artifacts: ModeArtifact[]) => void;
  onStatus?: (message: string) => void;
};

type NumericField = Exclude<keyof ParameterSweepInput, 'model'>;

const modelLabels: Record<ParameterSweepModel, string> = {
  linear: '线性',
  decay: '衰减',
  saturation: '饱和'
};

const initialForm: Record<NumericField, string> & { model: ParameterSweepModel } = {
  model: 'linear',
  start: '0',
  end: '10',
  steps: '11',
  coefficient: '1',
  initialValue: '0'
};

function buildPolyline(points: ParameterSweepPoint[]) {
  if (!points.length) return '';
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  return points
    .map((point) => {
      const xRatio = maxX === minX ? 0.5 : (point.x - minX) / (maxX - minX);
      const yRatio = maxY === minY ? 0.5 : (point.y - minY) / (maxY - minY);
      return `${40 + xRatio * 520},${24 + (1 - yRatio) * 252}`;
    })
    .join(' ');
}

export function SimulationWorkbenchPage({ onGenerate, onChange, onStatus }: SimulationWorkbenchPageProps) {
  const [form, setForm] = useState(initialForm);
  const [points, setPoints] = useState<ParameterSweepPoint[]>([]);
  const [lastRunInput, setLastRunInput] = useState<ParameterSweepInput | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const polyline = useMemo(() => buildPolyline(points), [points]);

  function invalidateRun() {
    setPoints([]);
    setLastRunInput(null);
  }

  function updateModel(model: ParameterSweepModel) {
    setForm((current) => ({ ...current, model }));
    setError('');
    invalidateRun();
  }

  function updateNumber(field: NumericField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
    invalidateRun();
  }

  function getInput(): ParameterSweepInput {
    return parseParameterSweepForm(form);
  }

  function runSimulation() {
    try {
      const input = getInput();
      const result = runParameterSweep(input);
      setPoints(result.points);
      setLastRunInput(input);
      setError('');
      onStatus?.(`仿真完成，共生成 ${result.points.length} 个采样点`);
    } catch (cause) {
      setPoints([]);
      setLastRunInput(null);
      setError(cause instanceof Error ? cause.message : '参数无效，请检查输入');
    }
  }

  async function generateReport() {
    if (!points.length || !lastRunInput) return;
    setBusy(true);
    try {
      const input = lastRunInput;
      const rows = points.map((point) => `x=${formatSimulationNumber(point.x)}, y=${formatSimulationNumber(point.y)}`).join('\n');
      const next = await onGenerate({
        tabId: 'simulation-report',
        artifactKind: '实验仿真报告',
        prompt: `请根据以下确定性参数扫描结果生成实验仿真报告。\n模型：${modelLabels[input.model]}\n参数：${JSON.stringify(input)}\n结果：\n${rows}`
      });
      onChange(next);
      const newestArtifact = next[0];
      onStatus?.(newestArtifact?.source === 'agent' ? 'AI 仿真报告已生成' : '模型不可用，已生成本地模板');
    } finally {
      setBusy(false);
    }
  }

  const summary = points.length
    ? {
        count: points.length,
        minimum: Math.min(...points.map((point) => point.y)),
        maximum: Math.max(...points.map((point) => point.y)),
        final: points.at(-1)?.y ?? 0
      }
    : null;

  return (
    <section className="panel specialized-mode-page simulation-workbench-page">
      <div className="page-section-header">
        <div>
          <div className="section-title">参数扫描</div>
          <h3>实验仿真工作台</h3>
          <p className="muted">配置确定性模型，运行后检查数据表与趋势图。</p>
        </div>
        <button className="primary" onClick={runSimulation}>运行仿真</button>
      </div>

      <div className="simulation-model-control segmented-control" aria-label="仿真模型">
        {(Object.keys(modelLabels) as ParameterSweepModel[]).map((model) => (
          <button
            key={model}
            className={form.model === model ? 'active' : ''}
            onClick={() => updateModel(model)}
          >
            {modelLabels[model]}
          </button>
        ))}
      </div>

      <div className="simulation-parameter-grid">
        <label className="simulation-field">
          起始值
          <input type="number" value={form.start} onChange={(event) => updateNumber('start', event.target.value)} />
        </label>
        <label className="simulation-field">
          结束值
          <input type="number" value={form.end} onChange={(event) => updateNumber('end', event.target.value)} />
        </label>
        <label className="simulation-field">
          步数
          <input type="number" min="2" max="50" step="1" value={form.steps} onChange={(event) => updateNumber('steps', event.target.value)} />
        </label>
        <label className="simulation-field">
          系数
          <input type="number" step="any" value={form.coefficient} onChange={(event) => updateNumber('coefficient', event.target.value)} />
        </label>
        <label className="simulation-field">
          初始值
          <input type="number" step="any" value={form.initialValue} onChange={(event) => updateNumber('initialValue', event.target.value)} />
        </label>
      </div>

      {error && <div className="inline-validation" role="alert">{error}</div>}

      {summary ? (
        <>
          <div className="simulation-summary-grid">
            <div><span>采样点</span><strong>{summary.count}</strong></div>
            <div><span>最小值</span><strong>{formatSimulationNumber(summary.minimum)}</strong></div>
            <div><span>最大值</span><strong>{formatSimulationNumber(summary.maximum)}</strong></div>
            <div><span>终点值</span><strong>{formatSimulationNumber(summary.final)}</strong></div>
          </div>

          <div className="simulation-output-grid">
            <div className="simulation-chart" aria-label="仿真趋势图">
              <svg viewBox="0 0 600 320" role="img" aria-label="参数扫描折线图">
                <line x1="40" y1="276" x2="560" y2="276" />
                <line x1="40" y1="24" x2="40" y2="276" />
                <polyline points={polyline} />
              </svg>
            </div>
            <div className="simulation-table-scroll">
              <table>
                <thead><tr><th>序号</th><th>x</th><th>y</th></tr></thead>
                <tbody>
                  {points.map((point, index) => (
                    <tr key={`${point.x}-${index}`}><td>{index + 1}</td><td>{formatSimulationNumber(point.x)}</td><td>{formatSimulationNumber(point.y)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="panel-actions horizontal">
            <button onClick={() => void generateReport()} disabled={busy}>{busy ? '生成中...' : '生成实验报告'}</button>
          </div>
        </>
      ) : (
        <div className="empty-slim">运行仿真后将在此显示结果。</div>
      )}
    </section>
  );
}
