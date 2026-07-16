type SettingsCategory = 'services' | 'workspace' | 'document' | 'default' | 'generation' | 'display';

type SettingsCategoryNavProps = {
  activeCategory: SettingsCategory;
  onSelectCategory: (category: SettingsCategory) => void;
};

const categories: Array<{ id: SettingsCategory; label: string; description: string }> = [
  { id: 'services', label: '模型服务', description: '服务商、密钥与端点' },
  { id: 'workspace', label: '全局能力', description: '画像、智能体与布局规则' },
  { id: 'document', label: '文档识别', description: 'MinerU 与文件解析' },
  { id: 'default', label: '默认模型', description: '新项目使用的模型' },
  { id: 'generation', label: '生成参数', description: '温度与输出长度' },
  { id: 'display', label: '显示', description: 'LaTeX 与预览偏好' }
];

export default function SettingsCategoryNav({ activeCategory, onSelectCategory }: SettingsCategoryNavProps) {
  return (
    <nav className="settings-category-nav" aria-label="设置分类">
      <div className="settings-column-heading">
        <span>Settings</span>
        <strong>系统设置</strong>
      </div>
      <div className="settings-category-list">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={activeCategory === category.id ? 'settings-category active' : 'settings-category'}
            onClick={() => onSelectCategory(category.id)}
          >
            <span>{category.label}</span>
            <small>{category.description}</small>
          </button>
        ))}
      </div>
    </nav>
  );
}

export type { SettingsCategory };
