import { useT } from '../../i18n';

type AgentOrchestrationPageProps = {
  profileReady: boolean;
  resourceCount: number;
  hasPathPlan: boolean;
  reportCount: number;
  onOpenTab: (tab: 'profile' | 'resources' | 'path' | 'report' | 'delivery') => void;
};

export function AgentOrchestrationPage({
  profileReady,
  resourceCount,
  hasPathPlan,
  reportCount,
  onOpenTab
}: AgentOrchestrationPageProps) {
  const { t } = useT();

  const agents = [
    { id: 'profile', name: 'ProfileAgent', titleKey: 'agent.profileAgent', descKey: 'agent.profileAgentDesc' },
    { id: 'resources', name: 'ResourceAgent', titleKey: 'agent.resourceAgent', descKey: 'agent.resourceAgentDesc' },
    { id: 'path', name: 'PathAgent', titleKey: 'agent.pathAgent', descKey: 'agent.pathAgentDesc' },
    { id: 'report', name: 'ReportAgent', titleKey: 'agent.reportAgent', descKey: 'agent.reportAgentDesc' },
    { id: 'delivery', name: 'DeliveryAgent', titleKey: 'agent.deliveryAgent', descKey: 'agent.deliveryAgentDesc' },
  ];

  const statusByAgent: Record<string, string> = {
    profile: profileReady ? t('agent.configured') : t('agent.pending'),
    resources: resourceCount ? t('agent.resourceCount', { count: resourceCount }) : t('agent.toGenerate'),
    path: hasPathPlan ? t('agent.generated') : t('agent.toPlan'),
    report: reportCount ? t('agent.reportCount', { count: reportCount }) : t('agent.toSummarize'),
    delivery: t('agent.toConnect')
  };

  return (
    <section className="panel agent-orchestration-page">
      <div className="page-section-header">
        <div>
          <div className="section-title">{t('agent.title')}</div>
          <h3>{t('agent.subtitle')}</h3>
          <p className="muted">{t('agent.desc')}</p>
        </div>
      </div>

      <div className="agent-flow-grid">
        {agents.map((agent, index) => (
          <button
            key={agent.id}
            className="agent-flow-card"
            onClick={() => onOpenTab(agent.id as 'profile' | 'resources' | 'path' | 'report' | 'delivery')}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{agent.name}</strong>
            <em>{t(agent.titleKey)}</em>
            <small>{t(agent.descKey)}</small>
            <b>{statusByAgent[agent.id]}</b>
          </button>
        ))}
      </div>

      <div className="agent-pipeline-note">
        <div className="subsection-title">{t('agent.recommendedOrder')}</div>
        <p>{t('agent.recommendedOrderDesc')}</p>
      </div>
    </section>
  );
}
