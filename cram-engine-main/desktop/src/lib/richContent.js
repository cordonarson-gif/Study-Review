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
