/* ================================================================
   themeManager.ts
   主题模式管理 — 日间 / 夜间 / 系统跟随
   通过在 <html> 元素上切换 .dark class 实现，纯 CSS 变量驱动
   ================================================================ */

export type ThemeMode = 'light' | 'dark' | 'auto';

const DARK_CLASS = 'dark';

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * 判断指定模式下实际是否为暗色
 * auto 模式下读取系统偏好
 */
export function isDarkActive(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return systemPrefersDark();
}

/**
 * 应用主题到 DOM
 * 在 <html> 元素上添加或移除 .dark class
 */
export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  const shouldDark = isDarkActive(mode);
  if (shouldDark) {
    root.classList.add(DARK_CLASS);
  } else {
    root.classList.remove(DARK_CLASS);
  }
}

/**
 * 监听系统暗色模式变化
 * 供 auto 模式实时响应系统主题切换
 * 返回取消监听的函数
 */
export function watchSystemTheme(callback: () => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => callback();
  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}
