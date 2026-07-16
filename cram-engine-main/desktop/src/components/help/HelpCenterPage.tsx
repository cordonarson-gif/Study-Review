import { projectModeTemplates } from '../../lib/projectModes';

type HelpCenterPageProps = {
  apiStatusLabel: string;
  latexStatusLabel: string;
  projectCount: number;
  hasApiKey: boolean;
};

const workflowSteps = [
  { title: '1. 配置服务', detail: '先完成 API、默认模型、MinerU 和 LaTeX 环境检查。模型可用后，AI 助教、成果生成、题目生成和报告生成都会使用同一套项目服务。' },
  { title: '2. 选择模式', detail: '新建项目时先选择 16 类项目模式。期末复习、论文助手、实验仿真、知识图谱、教学游戏等模式会决定后续字段、标签页和交付物。' },
  { title: '3. 导入资料', detail: '上传教材、课件、论文、数据表、图片或题目文本。图片会显示预览，复杂文档优先走 MinerU，识别出的文字可以沉淀到项目知识库。' },
  { title: '4. 生成成果', detail: '根据项目模式进入对应页面生成论文大纲、仿真报告、教学设计、课件、测验、知识图谱、错题分析或阶段报告。' },
  { title: '5. 复核修订', detail: 'AI 生成内容默认可编辑。建议把关键信息同步到知识库、题库或交付包，并用项目历史对话继续追问。' },
  { title: '6. 交付迁移', detail: '交付页会把成果整理成 Markdown 和 JSON。导出的项目包可在另一台电脑导入，恢复项目内容、题库、资料和交付状态。' }
];

const modeHighlights = ['期末复习', '论文助手', '实验仿真', '科研数据分析', '教学游戏', '知识图谱', '错题集'];

function DetailGrid({
  items
}: {
  items: Array<{ title: string; detail: string }>;
}) {
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
  return (
    <section className="help-center-page">
      <div className="help-center-hero">
        <div>
          <span className="upload-kind">帮助与支持</span>
          <h2>从配置到交付的完整流程</h2>
          <p>
            这里是 Cram Engine 的完整功能手册。它覆盖从首次配置、项目创建、资料识别、刷题与 AI 出题，
            到论文助手、实验仿真、科研分析、教学设计、知识图谱、交付导出和跨电脑迁移的全流程。
          </p>
        </div>
        <div className="help-system-strip" aria-label="当前系统状态">
          <div>
            <span>API</span>
            <strong>{hasApiKey ? apiStatusLabel : '未配置'}</strong>
          </div>
          <div>
            <span>LaTeX</span>
            <strong>{latexStatusLabel}</strong>
          </div>
          <div>
            <span>项目</span>
            <strong>{projectCount}</strong>
          </div>
        </div>
      </div>

      <div className="help-center-layout">
        <aside className="help-center-toc" aria-label="帮助目录">
          <strong>目录</strong>
          <a href="#help-quickstart">十分钟上手路线</a>
          <a href="#help-api">配置 API 与模型服务</a>
          <a href="#help-mineru">MinerU 文档识别</a>
          <a href="#help-latex">LaTeX 与公式环境</a>
          <a href="#help-create-project">新建项目向导</a>
          <a href="#help-project-modes">所有项目模式</a>
          <a href="#help-workspace">工作台通用功能</a>
          <a href="#help-specialized">专用功能工作台</a>
          <a href="#help-practice">刷题、错题与 AI 出题</a>
          <a href="#help-assistant">AI 助教与内容生成</a>
          <a href="#help-selection-ai">框选内容问 AI</a>
          <a href="#help-delivery">成果交付与导出</a>
          <a href="#help-import-export">项目导入、导出与迁移</a>
          <a href="#help-data">本地数据与隐私边界</a>
          <a href="#help-troubleshooting">常见问题排查</a>
        </aside>

        <div className="help-center-content">
          <section className="help-center-section" id="help-quickstart">
            <span className="help-section-index">00</span>
            <h3>十分钟上手路线</h3>
            <p>
              如果第一次打开软件，建议按下面顺序走一遍。这样可以最快验证模型、文件识别、项目工作台、
              AI 助教和交付导出是否都能正常工作。
            </p>
            <ol className="help-step-list">
              {workflowSteps.map((step) => (
                <li key={step.title}>
                  <strong>{step.title}</strong>
                  <span>{step.detail}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="help-center-section" id="help-api">
            <span className="help-section-index">01</span>
            <h3>配置 API 与模型服务</h3>
            <p>
              第一次使用先打开左侧设置。推荐创建一个可用服务商，填写 API Key、Base URL 和默认模型，
              再点连接测试。项目生成成果、AI 助教对话和模式成果都会优先使用项目绑定的服务商。
            </p>
            <DetailGrid
              items={[
                { title: '推荐操作顺序', detail: '新增服务商 → 填 Base URL → 填 API Key → 选择模型 → 连接测试 → 保存。' },
                { title: '适用场景', detail: 'DeepSeek、OpenAI 兼容接口、Anthropic、自定义模型端点和本地兼容网关。' },
                { title: '关键入口', detail: '左侧设置 → 模型服务。保存后左下角状态卡会显示当前可用服务商。' },
                { title: '容易踩坑', detail: '模型 ID 要和服务端一致；Base URL 不要重复带 chat/completions；切换服务商后要保存。' }
              ]}
            />
          </section>

          <section className="help-center-section" id="help-mineru">
            <span className="help-section-index">02</span>
            <h3>MinerU 文档识别</h3>
            <p>
              设置页的文档识别用于处理复杂文件。启用 MinerU 后，上传 PDF、Word、PPT、Excel、图片、
              CSV、JSON、Markdown 等素材时，系统会优先尝试提取正文，提取失败也会保留文件本体和提示。
            </p>
            <DetailGrid
              items={[
                { title: '推荐操作顺序', detail: '开启 MinerU → 填 Base URL 与 API Key → 选择解析模式 → 开启上传时优先识别。' },
                { title: '适用场景', detail: '教材 PDF、扫描图片、比赛通知、论文、实验数据表、课件和批量补充文件。' },
                { title: '关键入口', detail: '设置 → 文档识别；项目资料页右上角上传素材；导题页导入文件。' },
                { title: '容易踩坑', detail: '没有 MinerU 时二进制文件不会丢失，但只能保存文件本体和基础提示。' }
              ]}
            />
          </section>

          <section className="help-center-section" id="help-latex">
            <span className="help-section-index">03</span>
            <h3>LaTeX 与公式环境</h3>
            <p>
              LaTeX 用于论文、公式、实验报告和复杂数学内容。系统会检测 MiKTeX 或其它 LaTeX 可执行环境；
              检测到后显示配置成功，未检测到时会提示安装。
            </p>
            <DetailGrid
              items={[
                { title: '推荐操作顺序', detail: '先安装 MiKTeX 或 TeX Live → 重启软件 → 查看左下角 LaTeX 状态。' },
                { title: '适用场景', detail: '论文助手、科研结果创新、数学推导、实验报告和公式较多的教学内容。' },
                { title: '关键入口', detail: '左下角状态卡、系统状态、设置页环境状态。' },
                { title: '容易踩坑', detail: '刚安装后 PATH 可能未刷新，重启软件或系统后再检测。' }
              ]}
            />
          </section>

          <section className="help-center-section" id="help-create-project">
            <span className="help-section-index">04</span>
            <h3>新建项目向导</h3>
            <p>
              新建项目分三步：项目信息、目标要求、素材或题目导入。题目型项目会进入题目导入流程；
              论文、科研、教学、图谱等资料型项目会进入素材说明流程。
            </p>
            <div className="help-flow-grid">
              {workflowSteps.map((step) => (
                <article key={step.title}>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="help-center-section" id="help-project-modes">
            <span className="help-section-index">05</span>
            <h3>所有项目模式</h3>
            <p>
              现在的系统不只是期末复习。每个模式都有自己的向导字段、工作台标签、智能体和交付物。
              常用入口包括 {modeHighlights.join('、')}。
            </p>
            <div className="help-mode-grid">
              {projectModeTemplates.map((template) => (
                <article key={template.mode} className="help-mode-card">
                  <span>{template.icon}</span>
                  <div>
                    <h4>{template.title}</h4>
                    <p>{template.description}</p>
                    <small>标签页：{template.tabs.map((tab) => tab.label).join(' / ')}</small>
                    <small>交付物：{template.deliverables.map((item) => item.label).join('、')}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="help-center-section" id="help-workspace">
            <span className="help-section-index">06</span>
            <h3>工作台通用功能</h3>
            <p>
              项目创建后进入工作台。顶部标签会随项目模式变化，但资料、画像、智能体、资源、路径、报告、
              交付这些基础模块共同构成项目闭环。
            </p>
            <DetailGrid
              items={[
                { title: '资料', detail: '上传课件、论文、数据表、图片和备注，形成项目知识来源。' },
                { title: '画像与资源', detail: '维护学习画像，生成讲义、例题、速记卡和补漏资料。' },
                { title: '路径与报告', detail: '生成阶段计划、每日任务、风险提醒和阶段复盘报告。' },
                { title: '智能体', detail: '查看 ProfileAgent、ResourceAgent、PathAgent、ReportAgent 和 DeliveryAgent 的协作链路。' }
              ]}
            />
          </section>

          <section className="help-center-section" id="help-specialized">
            <span className="help-section-index">07</span>
            <h3>专用功能工作台</h3>
            <p>
              部分模式有专门交互页面，不只是文本生成。实验仿真可以跑参数扫描，知识图谱可以浏览节点关系，
              互动课件可以分页预览，教学游戏可以试玩并即时反馈，错题集复用导题和练习闭环。
            </p>
            <div className="help-special-grid">
              <article><strong>实验仿真</strong><span>选择线性、衰减或饱和模型，输入参数范围，生成表格、曲线和报告。</span></article>
              <article><strong>知识图谱</strong><span>从知识库、题目和模式成果构建节点与关系，可筛选类型并查看证据。</span></article>
              <article><strong>互动课件</strong><span>从 Markdown 或 AI 成果拆分页，提供 16:9 预览、保存和再生成。</span></article>
              <article><strong>教学游戏</strong><span>筛选可玩的选择题，逐题作答、计分、反馈并支持重新开始。</span></article>
              <article><strong>错题整理</strong><span>批量导入错题后进入复盘、复练、错因分析和交付导出。</span></article>
            </div>
          </section>

          <section className="help-center-section" id="help-practice">
            <span className="help-section-index">08</span>
            <h3>刷题、错题与 AI 出题</h3>
            <p>
              题目型项目会按导入来源形成题库，再按知识点、题型和错题状态进入练习。AI 出题入口位于刷题页顶部，
              可以指定题型、难度、知识点和参考题目，生成后自动加入左侧题库。
            </p>
            <DetailGrid
              items={[
                { title: '推荐操作顺序', detail: '先导入原题 → 检查题库名称 → 刷题标记错题 → AI 按薄弱点补题。' },
                { title: '适用场景', detail: '期末复习、在线测验、作业出题批改、教学游戏和错题收集整理。' },
                { title: '关键入口', detail: '工作台 → 刷题 / 导题；刷题页顶部 “AI 出题”。' },
                { title: '容易踩坑', detail: 'OCR 题目不清晰时要人工校正题干、选项和答案，避免分类误差继续扩散。' }
              ]}
            />
          </section>

          <section className="help-center-section" id="help-assistant">
            <span className="help-section-index">09</span>
            <h3>AI 助教与内容生成</h3>
            <p>
              右侧 AI 助教是项目内独立聊天框。每个项目拥有自己的历史记录，切换项目后会加载该项目的对话；
              历史页可以搜索往期问题和回答，点击“继续追问”会把对应内容带回输入框。
            </p>
            <DetailGrid
              items={[
                { title: '推荐操作顺序', detail: '打开项目 → 打开 AI 助教 → 对话 → 必要时同步到知识库或题库 → 在历史页继续追问。' },
                { title: '适用场景', detail: '解释概念、拆解题目、总结论文、提炼课堂活动、从已有对话继续深入。' },
                { title: '关键入口', detail: '右下角 AI 按钮；右侧抽屉的“对话 / 历史 / 参考资料”。' },
                { title: '容易踩坑', detail: '没有打开项目时不发送项目对话；模型不可用时会返回配置提示。' }
              ]}
            />
          </section>

          <section className="help-center-section" id="help-selection-ai">
            <span className="help-section-index">10</span>
            <h3>框选内容问 AI</h3>
            <p>
              在软件内部选中页面文字后，选区右上角会出现“问一问 AI”。点击后会打开右侧 AI 助教，
              自动把选中文字带入当前项目上下文，适合临时解释、改写、追问和生成题目。
            </p>
            <DetailGrid
              items={[
                { title: '推荐操作顺序', detail: '选中项目内容 → 点击问一问 AI → 修改输入框中的问题 → 发送。' },
                { title: '适用场景', detail: '帮助页、资料摘要、题目解析、阶段报告、知识库内容和 AI 回复中的局部追问。' },
                { title: '关键入口', detail: '任意内部页面的文字选区右上角。该功能不会调用外部浏览器插件。' },
                { title: '容易踩坑', detail: '输入框、按钮和外部网页里的选区不会触发；未打开项目时只会提示先选择项目。' }
              ]}
            />
          </section>

          <section className="help-center-section" id="help-delivery">
            <span className="help-section-index">11</span>
            <h3>成果交付与导出</h3>
            <p>
              每个模式都有自己的交付清单。进入交付页后先生成交付包，检查 ready、needs-review 和 missing 状态，
              再导出 Markdown 和 JSON。导出的 JSON 使用版本化结构，并包含当前模式成果正文和结构化证据。
            </p>
            <div className="help-callout">
              建议导出前先回到相关标签页补齐缺失成果：例如教学游戏先准备可玩题库，知识图谱先完成图谱校订，
              实验仿真先生成报告，错题集先完成错因分析。
            </div>
          </section>

          <section className="help-center-section" id="help-import-export">
            <span className="help-section-index">12</span>
            <h3>项目导入、导出与迁移</h3>
            <p>
              本软件导出的项目可以在另一台电脑上的本软件中导入。导入后会恢复项目元信息、题库、知识库、
              学习画像、资源、路径、阶段报告、交付包和模式成果。
            </p>
            <DetailGrid
              items={[
                { title: '推荐操作顺序', detail: '源电脑导出项目包 → 拷贝到目标电脑 → 左侧导入项目 → 打开恢复后的项目检查。' },
                { title: '适用场景', detail: '换电脑、课堂分发、团队协作、备份阶段成果和归档课程项目。' },
                { title: '关键入口', detail: '左侧“导入项目”和导出页。交付页适合导出成果包，导出页适合迁移整个项目。' },
                { title: '容易踩坑', detail: '外部链接文件夹不会自动复制全部原始外部文件，建议把关键文件上传进项目。' }
              ]}
            />
          </section>

          <section className="help-center-section" id="help-data">
            <span className="help-section-index">13</span>
            <h3>本地数据与隐私边界</h3>
            <p>
              项目数据保存在本机项目目录下。API Key 保存在设置中，生成提示词会引用项目资料摘要和必要上下文，
              但不会把服务商密钥写入提示词。框选问 AI 也只在软件内部生效。
            </p>
            <DetailGrid
              items={[
                { title: '项目隔离', detail: '题库、聊天、知识库、上传文件、报告和交付包都按 projectId 存储。' },
                { title: '模型请求', detail: '只有发送 AI 对话或生成任务时才调用配置的模型接口。' },
                { title: '本地优先', detail: '模型不可用时部分功能会生成本地模板，避免工作流完全中断。' },
                { title: '迁移边界', detail: '导出项目包用于迁移项目状态；外部系统账号和插件状态不包含在项目包里。' }
              ]}
            />
          </section>

          <section className="help-center-section" id="help-troubleshooting">
            <span className="help-section-index">14</span>
            <h3>常见问题排查</h3>
            <div className="help-faq-list">
              <article><strong>左下角显示未配置</strong><p>进入设置检查当前服务商是否启用、API Key 是否保存、默认模型是否可见，并重新连接测试。</p></article>
              <article><strong>上传文件没有识别文本</strong><p>确认 MinerU 已开启且 Key 可用。没有 MinerU 时，二进制文件会保留，但只给出文件保存提示。</p></article>
              <article><strong>生成成果是本地模板</strong><p>说明项目绑定服务商不可用、请求超时或返回空内容。修复模型配置后重新生成即可。</p></article>
              <article><strong>LaTeX 显示异常</strong><p>安装 MiKTeX 或 TeX Live 后重启软件；系统检测到可执行环境后会显示配置成功。</p></article>
              <article><strong>历史聊天找不到</strong><p>确认当前打开的是同一个项目；AI 历史记录按项目隔离，不会混到其它项目里。</p></article>
              <article><strong>框选后没有按钮</strong><p>请在软件内部正文区域选择文字，避开输入框、按钮、菜单栏和外部网页内容。</p></article>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
