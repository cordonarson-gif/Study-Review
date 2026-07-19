import { projectModeTemplates } from '../../lib/projectModes';
import { useT } from '../../i18n';
import { localizeProjectModeTemplates } from '../../i18n/projectModes';

type HelpCenterPageProps = {
  apiStatusLabel: string;
  latexStatusLabel: string;
  projectCount: number;
  hasApiKey: boolean;
};

type HelpItem = { title: string; detail: string };

function DetailGrid({ items }: { items: HelpItem[] }) {
  return (
    <div className="help-detail-grid">
      {items.map((item) => (
        <article key={item.title}>
          <strong>{item.title}</strong>
          <span>{item.detail}</span>
        </article>
      ))}
    </div>
  );
}

export function HelpCenterPage({ apiStatusLabel, latexStatusLabel, projectCount, hasApiKey }: HelpCenterPageProps) {
  const { t } = useT();
  const localizedProjectModeTemplates = localizeProjectModeTemplates(projectModeTemplates, t);
  const workflowSteps = Array.from({ length: 6 }, (_, index) => ({
    title: t(`help.workflow${index + 1}Title`),
    detail: t(`help.workflow${index + 1}Desc`)
  }));
  const detailItems = (prefix: string): HelpItem[] => [
    { title: t('help.recommendedOrder'), detail: t(`help.${prefix}Order`) },
    { title: t('help.useCases'), detail: t(`help.${prefix}Cases`) },
    { title: t('help.keyEntry'), detail: t(`help.${prefix}Entry`) },
    { title: t('help.pitfalls'), detail: t(`help.${prefix}Pitfalls`) }
  ];
  const toc = [
    ['help-quickstart', 'help.quickstart'],
    ['help-api', 'help.apiSection'],
    ['help-mineru', 'help.mineruSection'],
    ['help-latex', 'help.latexSection'],
    ['help-create-project', 'help.createProject'],
    ['help-project-modes', 'help.projectModes'],
    ['help-workspace', 'help.workspaceSection'],
    ['help-specialized', 'help.specialized'],
    ['help-practice', 'help.practiceSection'],
    ['help-assistant', 'help.assistant'],
    ['help-selection-ai', 'help.selectionAi'],
    ['help-delivery', 'help.deliverySection'],
    ['help-import-export', 'help.importExport'],
    ['help-data', 'help.data'],
    ['help-troubleshooting', 'help.troubleshooting']
  ] as const;

  return (
    <section className="help-center-page">
      <div className="help-center-hero">
        <div>
          <span className="upload-kind">{t('help.badge')}</span>
          <h2>{t('help.heroTitle')}</h2>
          <p>{t('help.heroDesc')}</p>
        </div>
        <div className="help-system-strip" aria-label={t('help.systemStatus')}>
          <div><span>{t('help.api')}</span><strong>{hasApiKey ? apiStatusLabel : t('help.notConfigured')}</strong></div>
          <div><span>LaTeX</span><strong>{latexStatusLabel}</strong></div>
          <div><span>{t('help.projectLabel')}</span><strong>{projectCount}</strong></div>
        </div>
      </div>

      <div className="help-center-layout">
        <aside className="help-center-toc" aria-label={t('help.tocAria')}>
          <strong>{t('help.toc')}</strong>
          {toc.map(([id, key]) => <a key={id} href={`#${id}`}>{t(key)}</a>)}
        </aside>

        <div className="help-center-content">
          <section className="help-center-section" id="help-quickstart">
            <span className="help-section-index">00</span>
            <h3>{t('help.quickstart')}</h3>
            <p>{t('help.quickstartDesc')}</p>
            <ol className="help-step-list">
              {workflowSteps.map((step) => <li key={step.title}><strong>{step.title}</strong><span>{step.detail}</span></li>)}
            </ol>
          </section>

          <section className="help-center-section" id="help-api">
            <span className="help-section-index">01</span><h3>{t('help.apiSection')}</h3><p>{t('help.apiDesc')}</p>
            <DetailGrid items={detailItems('api')} />
          </section>

          <section className="help-center-section" id="help-mineru">
            <span className="help-section-index">02</span><h3>{t('help.mineruSection')}</h3><p>{t('help.mineruDesc')}</p>
            <DetailGrid items={detailItems('mineru')} />
          </section>

          <section className="help-center-section" id="help-latex">
            <span className="help-section-index">03</span><h3>{t('help.latexSection')}</h3><p>{t('help.latexDesc')}</p>
            <DetailGrid items={detailItems('latex')} />
          </section>

          <section className="help-center-section" id="help-create-project">
            <span className="help-section-index">04</span><h3>{t('help.createProject')}</h3><p>{t('help.createDesc')}</p>
            <div className="help-flow-grid">
              {workflowSteps.map((step) => <article key={step.title}><strong>{step.title}</strong><p>{step.detail}</p></article>)}
            </div>
          </section>

          <section className="help-center-section" id="help-project-modes">
            <span className="help-section-index">05</span><h3>{t('help.projectModes')}</h3><p>{t('help.modesDesc')}</p>
            <div className="help-mode-grid">
              {localizedProjectModeTemplates.map((template) => (
                <article key={template.mode} className="help-mode-card">
                  <span>{template.icon}</span>
                  <div>
                    <h4>{template.title}</h4>
                    <p>{template.description}</p>
                    <small>{t('help.tabsLabel', { items: template.tabs.map((tab) => tab.label).join(' / ') })}</small>
                    <small>{t('help.deliverablesLabel', { items: template.deliverables.map((item) => item.label).join(' / ') })}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="help-center-section" id="help-workspace">
            <span className="help-section-index">06</span><h3>{t('help.workspaceSection')}</h3><p>{t('help.workspaceDesc')}</p>
            <DetailGrid items={[
              { title: t('help.workspaceMaterials'), detail: t('help.workspaceMaterialsDesc') },
              { title: t('help.workspaceProfile'), detail: t('help.workspaceProfileDesc') },
              { title: t('help.workspacePath'), detail: t('help.workspacePathDesc') },
              { title: t('help.workspaceAgents'), detail: t('help.workspaceAgentsDesc') }
            ]} />
          </section>

          <section className="help-center-section" id="help-specialized">
            <span className="help-section-index">07</span><h3>{t('help.specialized')}</h3><p>{t('help.specializedDesc')}</p>
            <div className="help-special-grid">
              {[
                ['simulation', 'simulationDesc'],
                ['knowledgeGraph', 'knowledgeGraphDesc'],
                ['interactiveCourseware', 'interactiveCoursewareDesc'],
                ['teachingGame', 'teachingGameDesc'],
                ['mistakeReview', 'mistakeReviewDesc']
              ].map(([title, detail]) => <article key={title}><strong>{t(`help.${title}`)}</strong><span>{t(`help.${detail}`)}</span></article>)}
            </div>
          </section>

          <section className="help-center-section" id="help-practice">
            <span className="help-section-index">08</span><h3>{t('help.practiceSection')}</h3><p>{t('help.practiceDesc')}</p>
            <DetailGrid items={detailItems('practice')} />
          </section>

          <section className="help-center-section" id="help-assistant">
            <span className="help-section-index">09</span><h3>{t('help.assistant')}</h3><p>{t('help.assistantDesc')}</p>
            <DetailGrid items={detailItems('assistant')} />
          </section>

          <section className="help-center-section" id="help-selection-ai">
            <span className="help-section-index">10</span><h3>{t('help.selectionAi')}</h3><p>{t('help.selectionDesc')}</p>
            <DetailGrid items={detailItems('selection')} />
          </section>

          <section className="help-center-section" id="help-delivery">
            <span className="help-section-index">11</span><h3>{t('help.deliverySection')}</h3><p>{t('help.deliveryDesc')}</p>
            <div className="help-callout">{t('help.deliveryCallout')}</div>
          </section>

          <section className="help-center-section" id="help-import-export">
            <span className="help-section-index">12</span><h3>{t('help.importExport')}</h3><p>{t('help.importExportDesc')}</p>
            <DetailGrid items={detailItems('import')} />
          </section>

          <section className="help-center-section" id="help-data">
            <span className="help-section-index">13</span><h3>{t('help.data')}</h3><p>{t('help.dataDesc')}</p>
            <DetailGrid items={[
              { title: t('help.projectIsolation'), detail: t('help.projectIsolationDesc') },
              { title: t('help.modelRequests'), detail: t('help.modelRequestsDesc') },
              { title: t('help.localFirst'), detail: t('help.localFirstDesc') },
              { title: t('help.migrationBoundary'), detail: t('help.migrationBoundaryDesc') }
            ]} />
          </section>

          <section className="help-center-section" id="help-troubleshooting">
            <span className="help-section-index">14</span><h3>{t('help.troubleshooting')}</h3>
            <div className="help-faq-list">
              {['Provider', 'Upload', 'Template', 'Latex', 'History', 'Selection'].map((name) => (
                <article key={name}><strong>{t(`help.faq${name}`)}</strong><p>{t(`help.faq${name}Desc`)}</p></article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
