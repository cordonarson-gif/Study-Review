import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeRichHtml } from './richContent.js';

test('sanitizeRichHtml removes script tags and inline event handlers', () => {
  const dirtyHtml = '<p onclick="alert(1)">hello</p><script>alert(1)</script><img src="x" onerror="alert(2)">';
  const safeHtml = sanitizeRichHtml(dirtyHtml);

  assert.equal(safeHtml.includes('<script'), false);
  assert.equal(safeHtml.includes('onclick='), false);
  assert.equal(safeHtml.includes('onerror='), false);
  assert.equal(safeHtml.includes('<p>hello</p>'), true);
});
