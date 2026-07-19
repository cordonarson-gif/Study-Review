import { Marked } from 'marked';
import markedKatex from 'marked-katex-extension';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeUrlCharacterReferences(value) {
  const namedCharacters = {
    colon: ':',
    newline: '\n',
    tab: '\t'
  };

  return String(value).replace(
    /&#(?:x([0-9a-f]+)|(\d+));?|&(colon|newline|tab);?/gi,
    (match, hexValue, decimalValue, namedValue) => {
      if (namedValue) return namedCharacters[namedValue.toLowerCase()];
      const codePoint = Number.parseInt(hexValue ?? decimalValue, hexValue ? 16 : 10);
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;
      return String.fromCodePoint(codePoint);
    }
  );
}

function isSafeResourceUrl(value, allowMailto = false) {
  const decoded = decodeUrlCharacterReferences(value)
    .trim()
    .replace(/[\u0000-\u0020\u007f]+/g, '');
  if (!decoded) return true;

  const firstBoundary = decoded.search(/[/?#]/);
  const prefix = firstBoundary < 0 ? decoded : decoded.slice(0, firstBoundary);
  if (prefix.includes('&')) return false;

  const scheme = decoded.match(/^([a-z][a-z0-9+.-]*):/i)?.[1].toLowerCase();
  if (!scheme) return true;
  return scheme === 'http' || scheme === 'https' || (allowMailto && scheme === 'mailto');
}

const markdownRenderer = new Marked(
  markedKatex({
    nonStandard: true,
    throwOnError: false,
    trust: false
  }),
  {
    renderer: {
      html({ text }) {
        return escapeHtml(sanitizeRichHtml(text));
      },
      link({ href, title, tokens }) {
        const label = this.parser.parseInline(tokens);
        if (!isSafeResourceUrl(href, true)) return label;
        const titleAttribute = title ? ` title="${escapeHtml(title)}"` : '';
        return `<a href="${escapeHtml(href)}"${titleAttribute}>${label}</a>`;
      },
      image({ href, title, text }) {
        if (!isSafeResourceUrl(href)) return escapeHtml(text);
        const titleAttribute = title ? ` title="${escapeHtml(title)}"` : '';
        return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${titleAttribute}>`;
      }
    }
  }
);

function stripDangerousTags(html) {
  return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
}

function stripInlineEventHandlers(html) {
  return html.replace(/\s+on[a-z]+\s*=\s*(['"]).*?\1/gi, '');
}

function stripJavascriptUrls(html) {
  return html.replace(/\s+(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '');
}

export function sanitizeRichHtml(html) {
  return stripJavascriptUrls(stripInlineEventHandlers(stripDangerousTags(html)));
}

function isEscapedCharacter(line, index) {
  let backslashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && line[cursor] === '\\'; cursor -= 1) {
    backslashCount += 1;
  }
  return backslashCount % 2 === 1;
}

function matchMarkdownFence(line) {
  return line.match(
    /^(?:\s{0,3}>\s?)*\s{0,3}(?:(?:[-+*]|\d{1,9}[.)])\s+)?(`{3,}|~{3,})(.*)$/
  );
}

function normalizeLatexDelimitersInLine(line, activeCodeTicks, canOpenCodeSpan) {
  let result = '';
  let index = 0;
  let inlineCodeTicks = activeCodeTicks;

  while (index < line.length) {
    if (line[index] === '`') {
      let runLength = 1;
      while (line[index + runLength] === '`') runLength += 1;
      result += line.slice(index, index + runLength);
      if (isEscapedCharacter(line, index)) {
        index += runLength;
        continue;
      }
      if (inlineCodeTicks === 0 && canOpenCodeSpan(index + runLength, runLength)) {
        inlineCodeTicks = runLength;
      }
      else if (inlineCodeTicks === runLength) inlineCodeTicks = 0;
      index += runLength;
      continue;
    }

    if (inlineCodeTicks === 0) {
      const delimiter = line.slice(index, index + 2);
      if (delimiter === '\\(' || delimiter === '\\)') {
        result += '$';
        index += 2;
        continue;
      }
      if (delimiter === '\\[' || delimiter === '\\]') {
        result += '$$';
        index += 2;
        continue;
      }
    }

    result += line[index];
    index += 1;
  }

  return { text: result, inlineCodeTicks };
}

function hasClosingCodeTicks(lines, startLineIndex, startColumn, expectedLength) {
  for (let lineIndex = startLineIndex; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (lineIndex > startLineIndex) {
      if (!line.trim() || matchMarkdownFence(line)) return false;
    }

    let index = lineIndex === startLineIndex ? startColumn : 0;
    while (index < line.length) {
      if (line[index] !== '`') {
        index += 1;
        continue;
      }
      let runLength = 1;
      while (line[index + runLength] === '`') runLength += 1;
      if (!isEscapedCharacter(line, index) && runLength === expectedLength) return true;
      index += runLength;
    }
  }
  return false;
}

export function normalizeLatexDelimiters(content) {
  const lines = String(content ?? '').replace(/\r\n?/g, '\n').split('\n');
  let fence = null;
  let inlineCodeTicks = 0;
  let result = '';

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) result += inlineCodeTicks > 0 && !fence ? ' ' : '\n';
    const fenceMatch = matchMarkdownFence(line);
    if (fence) {
      if (
        fenceMatch
        && fenceMatch[1][0] === fence.marker
        && fenceMatch[1].length >= fence.length
        && !fenceMatch[2].trim()
      ) {
        fence = null;
      }
      result += line;
      return;
    }

    if (fenceMatch) {
      fence = { marker: fenceMatch[1][0], length: fenceMatch[1].length };
      inlineCodeTicks = 0;
      result += line;
      return;
    }

    const normalized = normalizeLatexDelimitersInLine(
      line,
      inlineCodeTicks,
      (startColumn, expectedLength) => (
        hasClosingCodeTicks(lines, lineIndex, startColumn, expectedLength)
      )
    );
    inlineCodeTicks = normalized.inlineCodeTicks;
    result += normalized.text;
  });

  return result;
}

export function renderRichContent(content, options = {}) {
  const normalized = normalizeLatexDelimiters(content);
  const rendered = options.inline
    ? markdownRenderer.parseInline(normalized, { gfm: true })
    : markdownRenderer.parse(normalized, { breaks: true, gfm: true });
  return sanitizeRichHtml(String(rendered));
}
