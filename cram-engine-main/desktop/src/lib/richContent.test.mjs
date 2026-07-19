import test from 'node:test';
import assert from 'node:assert/strict';
import { renderRichContent, sanitizeRichHtml } from './richContent.js';

test('sanitizeRichHtml removes script tags and inline event handlers', () => {
  const dirtyHtml = '<p onclick="alert(1)">hello</p><script>alert(1)</script><img src="x" onerror="alert(2)">';
  const safeHtml = sanitizeRichHtml(dirtyHtml);

  assert.equal(safeHtml.includes('<script'), false);
  assert.equal(safeHtml.includes('onclick='), false);
  assert.equal(safeHtml.includes('onerror='), false);
  assert.equal(safeHtml.includes('<p>hello</p>'), true);
});

test('renderRichContent renders all supported math delimiters before markdown parsing', () => {
  const content = [
    '## 二、题目与答案',
    '',
    '**1.** \\(\\displaystyle \\int_{-1}^{1} x^3\\,dx = \\)',
    '',
    '行内 $x^2$ 与块级：',
    '',
    '\\[\\frac{1}{2x-3}\\]',
    '',
    '$$\\int_0^1 (2x+1)\\,dx = 2$$'
  ].join('\n');

  const html = renderRichContent(content);

  assert.match(html, /<h2>[^<]+<\/h2>/);
  assert.equal((html.match(/class="katex/g) ?? []).length >= 4, true);
  assert.doesNotMatch(html, /<p>[^<]*\\\(/);
  assert.doesNotMatch(html, /\*\*1\.\*\*/);
});

test('renderRichContent preserves formulas inside code spans and fenced code blocks', () => {
  const html = renderRichContent('`\\(x^2\\)`\n\n```text\n\\[y^2\\]\n```');

  assert.match(html, /<code>\\\(x\^2\\\)<\/code>/);
  assert.match(html, /\\\[y\^2\\\]/);
  assert.doesNotMatch(html, /katex/);
});

test('renderRichContent preserves multiline code spans while normalizing math delimiters', () => {
  const html = renderRichContent('`\\(x\n+ y\\)`');

  assert.match(html, /<code>\\\(x \+ y\\\)<\/code>/);
  assert.doesNotMatch(html, /katex/);
  assert.doesNotMatch(html, /<ul>/);
});

test('renderRichContent leaves later markdown and math intact after an unmatched backtick', () => {
  const html = renderRichContent('prefix `literal\n\n## Heading\n\\(x^2\\)');

  assert.match(html, /<h2>Heading<\/h2>/);
  assert.match(html, /class="katex/);
  assert.match(html, /`literal/);
});

test('renderRichContent ignores escaped literal backticks when normalizing math', () => {
  const html = renderRichContent('\\`literal \\(x^2\\)\\`');

  assert.match(html, /class="katex/);
  assert.match(html, /`literal/);
});

test('renderRichContent preserves fenced code inside blockquotes and lists', () => {
  const html = renderRichContent([
    '> ```text',
    '> \\(x^2\\)',
    '> ```',
    '',
    '- ```text',
    '  \\(y^2\\)',
    '  ```',
    '',
    '\\(z^2\\)'
  ].join('\n'));

  assert.match(html, /<blockquote>/);
  assert.match(html, /<code class="language-text">\\\(x\^2\\\)/);
  assert.match(html, /<code class="language-text">\\\(y\^2\\\)/);
  assert.match(html, /class="katex/);
});

test('renderRichContent falls back for invalid formulas without throwing', () => {
  const html = renderRichContent('Invalid: \\(\\notARealCommand{1}\\)');

  assert.match(html, /notARealCommand/);
});

test('renderRichContent keeps rich-content sanitization enabled', () => {
  const html = renderRichContent('<img src="javascript:alert(1)" onerror="alert(2)">');

  assert.doesNotMatch(html, /javascript:/i);
  assert.doesNotMatch(html, /onerror=/i);
});

test('renderRichContent escapes raw HTML before it reaches the renderer DOM', () => {
  const html = renderRichContent([
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(2)><circle></circle></svg>',
    '<iframe srcdoc="<script>alert(3)</script>"></iframe>',
    '<a href="java&#x73;cript:alert(4)">open</a>'
  ].join('\n'));

  assert.doesNotMatch(html, /<(?:img|svg|circle|iframe|script|a)\b/i);
  assert.match(html, /&lt;img/);
  assert.match(html, /&lt;svg/);
  assert.match(html, /&lt;iframe/);
});

test('renderRichContent rejects entity-encoded javascript markdown links', () => {
  const html = renderRichContent([
    '[hex](java&#x73;cript:alert(1))',
    '[colon](javascript&#58;alert(2))',
    '[named](javascript&colon;alert(3))'
  ].join('\n'));

  assert.doesNotMatch(html, /<a\b/i);
  assert.doesNotMatch(html, /href=/i);
  assert.match(html, /hex/);
  assert.match(html, /colon/);
  assert.match(html, /named/);
});
