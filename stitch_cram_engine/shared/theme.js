// Cram Engine — 共享设计 Token + 暗色模式管理
// 所有 HTML 页面通过 <script src="../shared/theme.js"></script> 引用此文件
// 修改设计 token 时只需修改此处，无需逐个文件更新

// ═══════════════════════════════════════════
//  1. CSS 自定义属性（亮色 / 暗色双套）
// ═══════════════════════════════════════════
(function() {
    var style = document.createElement('style');
    style.id = 'cram-engine-theme-vars';
    style.textContent = [
        ':root {',
        '  --ce-primary: #5e39e0;',
        '  --ce-on-primary: #ffffff;',
        '  --ce-primary-container: #7757fa;',
        '  --ce-on-primary-container: #fffbff;',
        '  --ce-primary-fixed: #e6deff;',
        '  --ce-primary-fixed-dim: #cabeff;',
        '  --ce-on-primary-fixed: #1c0062;',
        '  --ce-on-primary-fixed-variant: #4816cb;',
        '  --ce-inverse-primary: #cabeff;',
        '  --ce-secondary: #00687a;',
        '  --ce-on-secondary: #ffffff;',
        '  --ce-secondary-container: #57dffe;',
        '  --ce-on-secondary-container: #006172;',
        '  --ce-secondary-fixed: #acedff;',
        '  --ce-secondary-fixed-dim: #4cd7f6;',
        '  --ce-on-secondary-fixed: #001f26;',
        '  --ce-on-secondary-fixed-variant: #004e5c;',
        '  --ce-tertiary: #8f4a00;',
        '  --ce-on-tertiary: #ffffff;',
        '  --ce-tertiary-container: #b35e00;',
        '  --ce-on-tertiary-container: #fffbff;',
        '  --ce-tertiary-fixed: #ffdcc4;',
        '  --ce-tertiary-fixed-dim: #ffb780;',
        '  --ce-on-tertiary-fixed: #2f1400;',
        '  --ce-on-tertiary-fixed-variant: #6f3800;',
        '  --ce-error: #ba1a1a;',
        '  --ce-on-error: #ffffff;',
        '  --ce-error-container: #ffdad6;',
        '  --ce-on-error-container: #93000a;',
        '  --ce-background: #f9f9f6;',
        '  --ce-on-background: #1a1c1b;',
        '  --ce-surface: #f9f9f6;',
        '  --ce-surface-bright: #f9f9f6;',
        '  --ce-surface-dim: #dadad7;',
        '  --ce-surface-variant: #e2e3e0;',
        '  --ce-surface-tint: #603ce2;',
        '  --ce-on-surface: #1a1c1b;',
        '  --ce-on-surface-variant: #484555;',
        '  --ce-inverse-surface: #2f312f;',
        '  --ce-inverse-on-surface: #f1f1ee;',
        '  --ce-surface-container-lowest: #ffffff;',
        '  --ce-surface-container-low: #f4f4f1;',
        '  --ce-surface-container: #eeeeeb;',
        '  --ce-surface-container-high: #e8e8e5;',
        '  --ce-surface-container-highest: #e2e3e0;',
        '  --ce-outline: #797587;',
        '  --ce-outline-variant: #c9c4d8;',
        '  --ce-glass-bg: rgba(255, 255, 255, 0.7);',
        '  --ce-glass-border: #e5e5e1;',
        '  --ce-scrollbar-thumb: #dadad7;',
        '  --ce-scrollbar-thumb-hover: #c9c4d8;',
        '  --ce-sidebar-bg: rgba(244, 244, 241, 0.5);',
        '  --ce-header-bg: rgba(249, 249, 246, 0.8);',
        '  --ce-footer-bg: #eeeeeb;',
        '  --ce-card-bg: #ffffff;',
        '  --ce-card-border: #e5e5e1;',
        '}',
        '.dark {',
        '  --ce-primary: #cabeff;',
        '  --ce-on-primary: #381c8a;',
        '  --ce-primary-container: #4e3bb8;',
        '  --ce-on-primary-container: #e6deff;',
        '  --ce-primary-fixed: #e6deff;',
        '  --ce-primary-fixed-dim: #cabeff;',
        '  --ce-on-primary-fixed: #1c0062;',
        '  --ce-on-primary-fixed-variant: #4816cb;',
        '  --ce-inverse-primary: #5e39e0;',
        '  --ce-secondary: #4cd7f6;',
        '  --ce-on-secondary: #003544;',
        '  --ce-secondary-container: #004e5c;',
        '  --ce-on-secondary-container: #acedff;',
        '  --ce-secondary-fixed: #acedff;',
        '  --ce-secondary-fixed-dim: #4cd7f6;',
        '  --ce-on-secondary-fixed: #001f26;',
        '  --ce-on-secondary-fixed-variant: #004e5c;',
        '  --ce-tertiary: #ffb780;',
        '  --ce-on-tertiary: #4e2600;',
        '  --ce-tertiary-container: #6f3800;',
        '  --ce-on-tertiary-container: #ffdcc4;',
        '  --ce-tertiary-fixed: #ffdcc4;',
        '  --ce-tertiary-fixed-dim: #ffb780;',
        '  --ce-on-tertiary-fixed: #2f1400;',
        '  --ce-on-tertiary-fixed-variant: #6f3800;',
        '  --ce-error: #ffb4ab;',
        '  --ce-on-error: #690005;',
        '  --ce-error-container: #93000a;',
        '  --ce-on-error-container: #ffdad6;',
        '  --ce-background: #0f1015;',
        '  --ce-on-background: #e2e3e0;',
        '  --ce-surface: #0f1015;',
        '  --ce-surface-bright: #1a1b22;',
        '  --ce-surface-dim: #0a0b0f;',
        '  --ce-surface-variant: #2f312f;',
        '  --ce-surface-tint: #cabeff;',
        '  --ce-on-surface: #e2e3e0;',
        '  --ce-on-surface-variant: #c9c4d8;',
        '  --ce-inverse-surface: #e2e3e0;',
        '  --ce-inverse-on-surface: #2f312f;',
        '  --ce-surface-container-lowest: #0a0b0f;',
        '  --ce-surface-container-low: #0f1015;',
        '  --ce-surface-container: #14151a;',
        '  --ce-surface-container-high: #1a1b22;',
        '  --ce-surface-container-highest: #202128;',
        '  --ce-outline: #938f9e;',
        '  --ce-outline-variant: #484555;',
        '  --ce-glass-bg: rgba(20, 21, 26, 0.7);',
        '  --ce-glass-border: #2f312f;',
        '  --ce-scrollbar-thumb: #484555;',
        '  --ce-scrollbar-thumb-hover: #797587;',
        '  --ce-sidebar-bg: rgba(15, 16, 21, 0.5);',
        '  --ce-header-bg: rgba(15, 16, 21, 0.8);',
        '  --ce-footer-bg: #14151a;',
        '  --ce-card-bg: #1a1b22;',
        '  --ce-card-border: #2f312f;',
        '}'
    ].join('\n');
    document.head.appendChild(style);
})();

// ═══════════════════════════════════════════
//  2. Tailwind 配置（颜色引用 CSS 变量）
// ═══════════════════════════════════════════
tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            "colors": {
                "primary":           "var(--ce-primary)",
                "on-primary":        "var(--ce-on-primary)",
                "primary-container": "var(--ce-primary-container)",
                "on-primary-container": "var(--ce-on-primary-container)",
                "primary-fixed":     "var(--ce-primary-fixed)",
                "primary-fixed-dim": "var(--ce-primary-fixed-dim)",
                "on-primary-fixed":  "var(--ce-on-primary-fixed)",
                "on-primary-fixed-variant": "var(--ce-on-primary-fixed-variant)",
                "inverse-primary":   "var(--ce-inverse-primary)",
                "secondary":         "var(--ce-secondary)",
                "on-secondary":      "var(--ce-on-secondary)",
                "secondary-container": "var(--ce-secondary-container)",
                "on-secondary-container": "var(--ce-on-secondary-container)",
                "secondary-fixed":   "var(--ce-secondary-fixed)",
                "secondary-fixed-dim": "var(--ce-secondary-fixed-dim)",
                "on-secondary-fixed": "var(--ce-on-secondary-fixed)",
                "on-secondary-fixed-variant": "var(--ce-on-secondary-fixed-variant)",
                "tertiary":          "var(--ce-tertiary)",
                "on-tertiary":       "var(--ce-on-tertiary)",
                "tertiary-container": "var(--ce-tertiary-container)",
                "on-tertiary-container": "var(--ce-on-tertiary-container)",
                "tertiary-fixed":    "var(--ce-tertiary-fixed)",
                "tertiary-fixed-dim": "var(--ce-tertiary-fixed-dim)",
                "on-tertiary-fixed": "var(--ce-on-tertiary-fixed)",
                "on-tertiary-fixed-variant": "var(--ce-on-tertiary-fixed-variant)",
                "error":             "var(--ce-error)",
                "on-error":          "var(--ce-on-error)",
                "error-container":   "var(--ce-error-container)",
                "on-error-container": "var(--ce-on-error-container)",
                "background":        "var(--ce-background)",
                "on-background":     "var(--ce-on-background)",
                "surface":           "var(--ce-surface)",
                "surface-bright":    "var(--ce-surface-bright)",
                "surface-dim":       "var(--ce-surface-dim)",
                "surface-variant":   "var(--ce-surface-variant)",
                "surface-tint":      "var(--ce-surface-tint)",
                "on-surface":        "var(--ce-on-surface)",
                "on-surface-variant":"var(--ce-on-surface-variant)",
                "inverse-surface":   "var(--ce-inverse-surface)",
                "inverse-on-surface":"var(--ce-inverse-on-surface)",
                "surface-container-lowest": "var(--ce-surface-container-lowest)",
                "surface-container-low":    "var(--ce-surface-container-low)",
                "surface-container":        "var(--ce-surface-container)",
                "surface-container-high":   "var(--ce-surface-container-high)",
                "surface-container-highest":"var(--ce-surface-container-highest)",
                "outline":           "var(--ce-outline)",
                "outline-variant":   "var(--ce-outline-variant)"
            },
            "borderRadius": {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "full": "9999px"
            },
            "spacing": {
                "xs": "4px",
                "gutter": "16px",
                "xl": "40px",
                "md": "16px",
                "base": "4px",
                "container-max": "1200px",
                "lg": "24px",
                "sm": "8px"
            },
            "fontFamily": {
                "body-base": ["Inter"],
                "display-hero": ["\"Source Serif 4\""],
                "headline-lg": ["\"Source Serif 4\""],
                "body-sm": ["Inter"],
                "label-caps": ["Inter"],
                "code-snippet": ["JetBrains Mono"],
                "title-md": ["Inter"]
            },
            "fontSize": {
                "body-base": ["15px", {"lineHeight": "1.6", "fontWeight": "400"}],
                "display-hero": ["48px", {"lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "700"}],
                "headline-lg": ["32px", {"lineHeight": "1.2", "fontWeight": "600"}],
                "body-sm": ["13px", {"lineHeight": "1.5", "fontWeight": "400"}],
                "label-caps": ["11px", {"lineHeight": "1", "letterSpacing": "0.05em", "fontWeight": "600"}],
                "code-snippet": ["14px", {"lineHeight": "1.5", "fontWeight": "450"}],
                "title-md": ["18px", {"lineHeight": "1.5", "fontWeight": "600"}]
            }
        }
    }
};

// ═══════════════════════════════════════════
//  3. 主题初始化与切换逻辑
// ═══════════════════════════════════════════
(function() {
    var STORAGE_KEY = 'cram-engine-theme';
    var DARK_CLASS = 'dark';
    var systemQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // 读取存储的偏好，默认 'auto'
    function getStoredTheme() {
        try {
            var v = localStorage.getItem(STORAGE_KEY);
            if (v === 'light' || v === 'dark' || v === 'auto') return v;
        } catch (e) {}
        return 'auto';
    }

    // 判断当前是否应该为暗色
    function shouldBeDark(theme) {
        if (theme === 'dark') return true;
        if (theme === 'light') return false;
        return systemQuery.matches; // 'auto'
    }

    // 应用主题到 DOM
    function applyTheme(theme) {
        var dark = shouldBeDark(theme);
        var root = document.documentElement;
        if (dark) {
            root.classList.add(DARK_CLASS);
        } else {
            root.classList.remove(DARK_CLASS);
        }
        // 触发自定义事件，供其他脚本监听
        window.dispatchEvent(new CustomEvent('cram-theme-change', { detail: { theme: theme, isDark: dark } }));
    }

    // 保存并应用
    function setTheme(theme) {
        try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
        applyTheme(theme);
    }

    // 系统主题变化时的回调（仅在 'auto' 模式下生效）
    function onSystemChange() {
        if (getStoredTheme() === 'auto') {
            applyTheme('auto');
        }
    }

    // ── 初始化 ──
    var current = getStoredTheme();
    applyTheme(current);
    systemQuery.addEventListener('change', onSystemChange);

    // ── 暴露 API 到全局 ──
    window.CramEngineTheme = {
        get: getStoredTheme,
        set: setTheme,
        isDark: function() { return document.documentElement.classList.contains(DARK_CLASS); }
    };
})();
