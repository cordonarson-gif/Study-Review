---
name: Scholar's Study
colors:
  surface: '#f9f9f6'
  surface-dim: '#dadad7'
  surface-bright: '#f9f9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f1'
  surface-container: '#eeeeeb'
  surface-container-high: '#e8e8e5'
  surface-container-highest: '#e2e3e0'
  on-surface: '#1a1c1b'
  on-surface-variant: '#484555'
  inverse-surface: '#2f312f'
  inverse-on-surface: '#f1f1ee'
  outline: '#797587'
  outline-variant: '#c9c4d8'
  surface-tint: '#603ce2'
  primary: '#5e39e0'
  on-primary: '#ffffff'
  primary-container: '#7757fa'
  on-primary-container: '#fffbff'
  inverse-primary: '#cabeff'
  secondary: '#00687a'
  on-secondary: '#ffffff'
  secondary-container: '#57dffe'
  on-secondary-container: '#006172'
  tertiary: '#8f4a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#b35e00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e6deff'
  primary-fixed-dim: '#cabeff'
  on-primary-fixed: '#1c0062'
  on-primary-fixed-variant: '#4816cb'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#ffdcc4'
  tertiary-fixed-dim: '#ffb780'
  on-tertiary-fixed: '#2f1400'
  on-tertiary-fixed-variant: '#6f3800'
  background: '#f9f9f6'
  on-background: '#1a1c1b'
  surface-variant: '#e2e3e0'
typography:
  display-hero:
    fontFamily: Source Serif 4
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Source Serif 4
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Source Serif 4
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.5'
  body-base:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
  code-snippet:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '450'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-max: 1200px
  gutter: 16px
---

## Brand & Style
The design system is built on the "Scholar's Study" aesthetic—a digital interpretation of a focused, physical workspace. It balances the intellectual gravity of traditional academia with the high-velocity efficiency of modern developer tools.

The style is **Minimalist-Refined**, leaning heavily into high-quality typography and intentional whitespace to create a "cozy-productive" atmosphere. It avoids unnecessary decoration, instead using subtle tonal layers and precise borders to organize complex information. The goal is to evoke a sense of calm authority and deep focus, reducing cognitive load during intensive study sessions.

## Colors
This design system utilizes a sophisticated, warm-neutral foundation to prevent eye strain during long hours of use.

- **Primary Canvas:** In light mode, the system uses a warm "Paper" white (#FAFAF7) to avoid the harshness of pure white. In dark mode, it transitions to "Charcoal" (#0F1015) with slightly elevated "Inkwell" surfaces (#1A1B22).
- **Ink Purple:** The brand primary is an "Ink-like" purple, representing deep thought and creativity.
- **Stage Colors:** Four distinct colors represent the workflow stages. These are used for status indicators, progress bars, and stage-specific icons.
- **Contrast:** Text should maintain high legibility, using deep grays (rather than pure black) on light backgrounds to preserve the warm aesthetic.

## Typography
The typographic scale is designed for density and clarity.

- **Hero & Headings:** Source Serif 4 provides "academic gravity." Use it for page titles, modal headers, and primary section breaks.
- **UI & Interaction:** Inter is the workhorse for all interface elements. It is optimized for legibility at small sizes and high-density layouts.
- **Data & Logic:** JetBrains Mono is used for LaTeX formulas, code snippets, and metadata labels to provide a precise, technical feel.
- **Hierarchy:** Use weight and color contrast over size to create hierarchy, keeping the overall scale compact to maximize information density on the screen.

## Layout & Spacing
This design system follows a **Fixed-Fluid Hybrid** model. Content is housed within a 1200px max-width container for readability, but uses fluid internal proportions.

- **Efficiency:** The spacing rhythm is tight, influenced by developer productivity tools. Use `16px (md)` for primary gaps and `8px (sm)` for related elements.
- **Grid:** A 12-column grid is standard for desktop. On mobile, margins reduce to 16px and layouts collapse to a single column.
- **Density:** Components should feel compact. Vertical padding in lists and inputs is minimized to allow more content to be visible above the fold.

## Elevation & Depth
In the "Scholar's Study" aesthetic, depth is created through **Tonal Layering** and **Low-Contrast Outlines** rather than heavy shadows.

- **Surfaces:** Use subtle shifts in background color to denote elevation. A primary surface is #FFFFFF (or #1A1B22 in dark mode), while the background is #FAFAF7.
- **Borders:** Define containers with 1px borders using a slightly darker version of the background color (e.g., #E5E5E1 in light mode).
- **Shadows:** Use a single, "Ambient" shadow style for floating elements like dropdowns or active cards: `0 4px 12px rgba(0, 0, 0, 0.05)`. It should be barely perceptible, serving only to separate the element from the paper-like background.

## Shapes
The shape language is controlled and precise.

- **Radius:** A standard radius of `10px` is applied to all primary containers, buttons, and input fields. This provides a modern, approachable feel without becoming overly "bubbly" or informal.
- **Consistency:** Maintain the same corner radius across nested elements when possible to preserve the "stacked paper" look. Small components like tags or checkboxes may use a reduced `4px` radius.

## Components
- **Buttons:** Primary buttons use the Ink Purple (#7C5CFF) with white text. Secondary buttons should be ghost-style with a subtle border and no background until hover.
- **Input Fields:** Use a 1px border. On focus, the border transitions to the primary brand color with a subtle 2px glow of the same color at 10% opacity.
- **Cards:** Cards should be "Flat-Raised"—white background, 1px neutral border, and a 10px corner radius. No shadow unless hovered.
- **Chips/Stages:** Use the semantic stage colors for tags. These should have a low-opacity background (10%) and a high-opacity text color for maximum readability.
- **Lists:** High-density lists with subtle separators (#E5E5E1). Active list items are indicated by a 2px vertical "Ink" stripe on the left edge.
- **Monospace Blocks:** For LaTeX or code, use a slightly darker background (e.g., #F0F0EC) with JetBrains Mono to set it apart as a "technical note" within the study session.
