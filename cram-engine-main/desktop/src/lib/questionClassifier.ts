/**
 * 题目自动分类引擎
 * 按知识点 + 题型构建分类目录树，支持手动调整与批量重分类
 */

import type { CategoryTreeNode, ReviewQuestion } from './types';

/**
 * 根据题目列表构建分类树
 * 两层结构：知识点 → 题型 → 题数
 *
 * @example
 * buildCategoryTree(questions)
 * // [{ name: '数学基础', count: 12, children: [{ name: '单选题', count: 8 }, { name: '简答题', count: 4 }] }]
 */
export function buildCategoryTree(questions: ReviewQuestion[]): CategoryTreeNode[] {
  const root = new Map<string, Map<string, number>>();

  for (const q of questions) {
    const kp = q.knowledgePoint || '未分类';
    const qt = q.questionType || '通用题型';
    if (!root.has(kp)) root.set(kp, new Map());
    const typeMap = root.get(kp)!;
    typeMap.set(qt, (typeMap.get(qt) ?? 0) + 1);
  }

  const tree: CategoryTreeNode[] = [];
  for (const [kp, typeMap] of root.entries()) {
    const children: CategoryTreeNode[] = [];
    let total = 0;
    for (const [qt, count] of typeMap.entries()) {
      children.push({ name: qt, count, children: [] });
      total += count;
    }
    // 题型按名称排序
    children.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    tree.push({ name: kp, count: total, children });
  }

  // 知识点按名称排序
  tree.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  return tree;
}

/**
 * 从分类树中提取所有知识点列表（扁平）
 */
export function getKnowledgePoints(tree: CategoryTreeNode[]): string[] {
  return tree.map((node) => node.name);
}

/**
 * 从分类树中提取所有分类标签（知识点 / 题型），用于筛选器
 */
export function getCategoryLabels(tree: CategoryTreeNode[]): string[] {
  const labels = new Set<string>();
  labels.add('全部');
  for (const kp of tree) {
    labels.add(kp.name);
    for (const qt of kp.children) {
      labels.add(`${kp.name} / ${qt.name}`);
    }
  }
  return Array.from(labels).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

/**
 * 计算刷题统计
 */
export function computePracticeStats(questions: ReviewQuestion[]) {
  const total = questions.length;
  const favorite = questions.filter((q) => q.favorite).length;
  const wrong = questions.filter((q) => q.wrong).length;
  const attempted = questions.filter((q) => q.attempts > 0).length;
  const correct = attempted - wrong;

  return {
    total,
    completed: attempted,
    correct: Math.max(0, correct),
    wrong,
    favorite
  };
}

/**
 * 获取知识点的兄弟节点（关联推荐）
 */
export function getRelatedKnowledgePoints(
  knowledgePoint: string,
  tree: CategoryTreeNode[]
): string[] {
  // 找到当前知识点所在分组的兄弟节点
  for (const kp of tree) {
    if (kp.name === knowledgePoint) {
      return tree
        .filter((n) => n.name !== knowledgePoint)
        .slice(0, 5)
        .map((n) => n.name);
    }
  }
  // 如果知识点不在树顶层，尝试模糊匹配
  const allPoints = getKnowledgePoints(tree);
  const related = allPoints.filter(
    (p) => p !== knowledgePoint && hasSharedChars(p, knowledgePoint, 2)
  );
  return related.slice(0, 5);
}

/** 检查两个字符串至少共享 N 个字符 */
function hasSharedChars(a: string, b: string, minShared: number): boolean {
  const setA = new Set(a);
  let shared = 0;
  for (const ch of b) {
    if (setA.has(ch)) {
      shared += 1;
      if (shared >= minShared) return true;
    }
  }
  return false;
}
