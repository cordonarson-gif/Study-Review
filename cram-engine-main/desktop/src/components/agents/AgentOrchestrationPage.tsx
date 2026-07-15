type AgentOrchestrationPageProps = {
  profileReady: boolean;
  resourceCount: number;
  hasPathPlan: boolean;
  reportCount: number;
  onOpenTab: (tab: 'profile' | 'resources' | 'path' | 'report' | 'delivery') => void;
};

const agents = [
  {
    id: 'profile',
    name: 'ProfileAgent',
    title: '学习画像维护',
    description: '分析学生基础、薄弱点、学习偏好和可用时间。'
  },
  {
    id: 'resources',
    name: 'ResourceAgent',
    title: '个性化资源生成',
    description: '生成讲义、例题、速记卡和补漏清单。'
  },
  {
    id: 'path',
    name: 'PathAgent',
    title: '学习路径规划',
    description: '把画像、题库和资源组织成阶段计划。'
  },
  {
    id: 'report',
    name: 'ReportAgent',
    title: '阶段报告总结',
    description: '汇总练习表现、知识沉淀、风险和下一步动作。'
  },
  {
    id: 'delivery',
    name: 'DeliveryAgent',
    title: '成果交付打包',
    description: '后续会把资料、报告、题库和归档统一组织成交付包。'
  }
] as const;

export function AgentOrchestrationPage({
  profileReady,
  resourceCount,
  hasPathPlan,
  reportCount,
  onOpenTab
}: AgentOrchestrationPageProps) {
  const statusByAgent: Record<(typeof agents)[number]['id'], string> = {
    profile: profileReady ? '已配置' : '待完善',
    resources: resourceCount ? `${resourceCount} 条资源` : '待生成',
    path: hasPathPlan ? '已生成' : '待规划',
    report: reportCount ? `${reportCount} 份报告` : '待总结',
    delivery: '待接入'
  };

  return (
    <section className="panel agent-orchestration-page">
      <div className="page-section-header">
        <div>
          <div className="section-title">多智能体编排</div>
          <h3>把画像、资源、路径、报告和交付串成一条工作流</h3>
          <p className="muted">这里不是空壳导航，而是当前项目内各 Agent 的运行状态和入口总览。</p>
        </div>
      </div>

      <div className="agent-flow-grid">
        {agents.map((agent, index) => (
          <button
            key={agent.id}
            className="agent-flow-card"
            onClick={() => onOpenTab(agent.id)}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{agent.name}</strong>
            <em>{agent.title}</em>
            <small>{agent.description}</small>
            <b>{statusByAgent[agent.id]}</b>
          </button>
        ))}
      </div>

      <div className="agent-pipeline-note">
        <div className="subsection-title">推荐执行顺序</div>
        <p>先完善学习画像，再生成个性化资源，然后生成学习路径，最后输出阶段报告和交付包。这个顺序能让每一步都有前置数据支撑。</p>
      </div>
    </section>
  );
}
