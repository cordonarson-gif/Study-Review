/**
 * 文件内容解析工具模块
 * 支持 txt / md / json / yaml / csv 等多种文本格式的内容提取与结构化
 */

/** 文件解析结果 */
export type ParsedContent = {
  /** 提取的纯文本内容 */
  text: string;
  /** 文件类型 */
  kind: 'file' | 'image';
  /** 简短摘要 */
  summary: string;
};

/**
 * 从文件名判断文件类型（文本 / 图片）
 */
export function classifyFile(filePath: string): 'file' | 'image' {
  const ext = filePath.toLowerCase().split('.').pop() ?? '';
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tiff', 'ico'];
  return imageExts.includes(ext) ? 'image' : 'file';
}

/**
 * 根据文件扩展名解析文本内容的不同格式
 * - .txt / .md: 直接返回原文
 * - .json: 尝试提取所有字符串字段拼接
 * - .yaml / .yml: 直接返回（已由 js-yaml 处理前）
 * - .csv: 保留 CSV 原始结构方便题目拆分
 */
export function parseFileContent(filename: string, rawText: string): ParsedContent {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  const kind = classifyFile(filename);

  if (kind === 'image') {
    return { text: rawText || '', kind: 'image', summary: '图片 OCR 识别结果' };
  }

  let text = rawText.trim();
  let summary = '';

  switch (ext) {
    case 'json': {
      try {
        const parsed = JSON.parse(text);
        // 尝试从常见结构中提取题目数组
        if (Array.isArray(parsed)) {
          text = parsed
            .map((item) => {
              if (typeof item === 'string') return item;
              if (typeof item === 'object' && item !== null) {
                const parts: string[] = [];
                if (item.stem || item.question || item.title) parts.push(`题目：${item.stem || item.question || item.title}`);
                if (item.options || item.choices) {
                  const opts = Array.isArray(item.options || item.choices)
                    ? (item.options || item.choices)
                    : [item.options || item.choices];
                  parts.push(opts.map((o: string | { key?: string; text?: string }, i: number) => {
                    if (typeof o === 'string') return `${String.fromCharCode(65 + i)}. ${o}`;
                    return `${o.key || String.fromCharCode(65 + i)}. ${o.text || ''}`;
                  }).join('\n'));
                }
                if (item.answer) parts.push(`答案：${item.answer}`);
                if (item.explanation || item.analysis) parts.push(`解析：${item.explanation || item.analysis}`);
                return parts.join('\n');
              }
              return String(item);
            })
            .join('\n\n');
        } else {
          text = Object.entries(parsed as Record<string, unknown>)
            .map(([, v]) => (typeof v === 'string' ? v : JSON.stringify(v)))
            .join('\n\n');
        }
        summary = `JSON 文件，已提取 ${text.split(/\n{2,}/).length} 段内容`;
      } catch {
        summary = 'JSON 解析失败，按纯文本处理';
      }
      break;
    }
    case 'csv': {
      // CSV 保留表格结构，便于题目拆分引擎识别编号列
      const lines = text.split(/\r?\n/).filter(Boolean);
      summary = `CSV 文件，${lines.length - 1} 行数据`;
      // 保持原始文本不做转换
      break;
    }
    case 'md':
    case 'markdown':
      summary = `Markdown 文件，${text.length} 字符`;
      break;
    case 'yaml':
    case 'yml':
      summary = `YAML 配置文件，${text.length} 字符`;
      break;
    default:
      summary = `文本文件（.${ext}），${text.length} 字符`;
      break;
  }

  return { text, kind: 'file', summary };
}

/**
 * 将多行文本按题目分隔符拆分为块
 * 支持：数字编号、Q1/Q2、第X题 等常见模式
 */
export function splitIntoBlocks(text: string): string[] {
  const normalized = text.replace(/\r/g, '').trim();
  if (!normalized) return [];

  // 在题号前插入分隔标记
  const marked = normalized
    .replace(/\n(?=\s*(?:第\s*\d+\s*[题題]|[Qq]\d+[\.\．、)]|\d+[\.\．、)]\s*[A-Z一-鿿]))/g, '\n\n@@SPLIT@@');

  let blocks = marked
    .split(/@@SPLIT@@/)
    .map((b) => b.trim())
    .filter((b) => b.length > 6);

  // 如果没有识别到题号分隔符，尝试按空行分隔
  if (blocks.length <= 1) {
    blocks = normalized
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter((b) => b.length > 6);
  }

  return blocks;
}
