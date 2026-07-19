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
import { useT } from '../../i18n';

type SimulationWorkbenchPageProps = {
  onGenerate: (input: GenerateModeArtifactInput) => Promise<ModeArtifact[]>;
  onChange: (artifacts: ModeArtifact[]) => void;
  onStatus?: (message: string) => void;
};

type NumericField = Exclude<keyof ParameterSweepInput, 'model'>;

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
  const { t } = useT();
  const modelLabels: Record<ParameterSweepModel, string> = {
    linear: t('simulation.linear'),
    decay: t('simulation.decay'),
    saturation: t('simulation.saturation')
  };
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
      onStatus?.(t('simulation.completed', { count: result.points.length }));
    } catch (cause) {
      setPoints([]);
      setLastRunInput(null);
      setError(cause instanceof Error ? cause.message : t('simulation.invalidInput'));
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
        artifactKind: t('simulation.reportKind'),
        prompt: `请根据以下确定性参数扫描结果生成实验仿真报告。\n模型：${modelLabels[input.model]}\n参数：${JSON.stringify(input)}\n结果：\n${rows}`
      });
      onChange(next);
      const newestArtifact = next[0];
      onStatus?.(newestArtifact?.source === 'agent' ? t('simulation.aiReportGenerated') : t('simulation.localReportGenerated'));
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
          <div className="section-title">{t('simulation.title')}</div>
          <h3>{t('simulation.subtitle')}</h3>
          <p className="muted">{t('simulation.desc')}</p>
        </div>
        <button className="primary" onClick={runSimulation}>{t('simulation.run')}</button>
      </div>

      <div className="simulation-model-control segmented-control" aria-label={t('simulation.simulationModel')}>
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
          {t('simulation.startValue')}
          <input type="number" value={form.start} onChange={(event) => updateNumber('start', event.target.value)} />
        </label>
        <label className="simulation-field">
          {t('simulation.endValue')}
          <input type="number" value={form.end} onChange={(event) => updateNumber('end', event.target.value)} />
        </label>
        <label className="simulation-field">
          {t('simulation.steps')}
          <input type="number" min="2" max="50" step="1" value={form.steps} onChange={(event) => updateNumber('steps', event.target.value)} />
        </label>
        <label className="simulation-field">
          {t('simulation.coefficient')}
          <input type="number" step="any" value={form.coefficient} onChange={(event) => updateNumber('coefficient', event.target.value)} />
        </label>
        <label className="simulation-field">
          {t('simulation.initialValue')}
          <input type="number" step="any" value={form.initialValue} onChange={(event) => updateNumber('initialValue', event.target.value)} />
        </label>
      </div>

      {error && <div className="inline-validation" role="alert">{error}</div>}

      {summary ? (
        <>
          <div className="simulation-summary-grid">
            <div><span>{t('simulation.samplePoints')}</span><strong>{summary.count}</strong></div>
            <div><span>{t('simulation.minValue')}</span><strong>{formatSimulationNumber(summary.minimum)}</strong></div>
            <div><span>{t('simulation.maxValue')}</span><strong>{formatSimulationNumber(summary.maximum)}</strong></div>
            <div><span>{t('simulation.finalValue')}</span><strong>{formatSimulationNumber(summary.final)}</strong></div>
          </div>

          <div className="simulation-output-grid">
            <div className="simulation-chart" aria-label={t('simulation.trendChart')}>
              <svg viewBox="0 0 600 320" role="img" aria-label={t('simulation.lineChart')}>
                <line x1="40" y1="276" x2="560" y2="276" />
                <line x1="40" y1="24" x2="40" y2="276" />
                <polyline points={polyline} />
              </svg>
            </div>
            <div className="simulation-table-scroll">
              <table>
                <thead><tr><th>{t('simulation.index')}</th><th>x</th><th>y</th></tr></thead>
                <tbody>
                  {points.map((point, index) => (
                    <tr key={`${point.x}-${index}`}><td>{index + 1}</td><td>{formatSimulationNumber(point.x)}</td><td>{formatSimulationNumber(point.y)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="panel-actions horizontal">
            <button onClick={() => void generateReport()} disabled={busy}>{busy ? t('common.generating') : t('simulation.generateReport')}</button>
          </div>
        </>
      ) : (
        <div className="empty-slim">{t('simulation.emptyResult')}</div>
      )}
    </section>
  );
}
