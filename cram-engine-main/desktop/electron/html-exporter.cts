/**
 * html-exporter.cts — 互动 HTML 导出模块
 *
 * Phase 6 / OpenMAIC: 将完整课程导出为单文件交互 HTML，
 * 内嵌幻灯片播放、测验评分、模拟实验。
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function exportInteractiveHtml(
  outputDir: string,
  generatedCourse: {
    outline: { meta: { title: string }; chapters: { title: string; sceneType: string }[] };
    scenes: any[];
  },
  courseTitle: string
): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const htmlPath = path.join(outputDir, `${courseTitle.replace(/[\/\\:*?"<>|]/g, '_')}_interactive.html`);

  const courseJson = JSON.stringify(generatedCourse, null, 2);

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(courseTitle)} - 互动课程</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, "Microsoft YaHei", sans-serif; background: #f0f2f5; color: #333; }
  .header { background: linear-gradient(135deg, #5e39e0, #7c5cff); color: #fff; padding: 20px 32px; }
  .header h1 { font-size: 24px; }
  .container { max-width: 900px; margin: 0 auto; padding: 20px; }
  .tab-bar { display: flex; gap: 4px; margin-bottom: 20px; flex-wrap: wrap; }
  .tab-bar button { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; background: #e8e8e8; }
  .tab-bar button.active { background: #5e39e0; color: #fff; }
  .slide-card { background: #fff; border-radius: 12px; padding: 32px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); min-height: 300px; }
  .slide-card h2 { font-size: 22px; margin-bottom: 20px; color: #1a1a2e; }
  .slide-card li { line-height: 2.1; font-size: 15px; animation: fadeIn 0.4s; }
  .quiz-option { display: flex; align-items: center; gap: 10px; padding: 12px 16px; margin: 6px 0; border: 1.5px solid #ddd; border-radius: 8px; cursor: pointer; font-size: 14px; }
  .quiz-option:hover { background: #f5f0ff; }
  .quiz-option.selected { border-color: #5e39e0; background: rgba(94,57,224,0.06); }
  .quiz-option.correct { border-color: #28c840; background: #e8f5e9; }
  .quiz-option.wrong { border-color: #ba1a1a; background: #fef2f2; }
  .sim-frame { width: 100%; height: 500px; border: 1px solid #ddd; border-radius: 8px; }
  .btn { padding: 8px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
  .btn-primary { background: #5e39e0; color: #fff; }
  .btn-primary:hover { background: #4a2db0; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .score-bar { display: flex; align-items: center; gap: 8px; padding: 12px; background: #fff; border-radius: 8px; margin: 12px 0; }
  .progress { height: 6px; background: #e0e0e0; border-radius: 3px; flex: 1; }
  .progress i { display: block; height: 100%; background: #5e39e0; border-radius: 3px; }
  .chapter-nav { display: flex; flex-direction: column; gap: 4px; }
  .chapter-nav button { text-align: left; padding: 8px 12px; border: none; background: transparent; cursor: pointer; font-size: 13px; border-radius: 6px; }
  .chapter-nav button:hover, .chapter-nav button.active { background: #e8e0ff; color: #5e39e0; }
  .layout { display: grid; grid-template-columns: 200px 1fr; gap: 20px; }
  @media (max-width: 700px) { .layout { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="header"><h1>📚 ${escapeHtml(courseTitle)}</h1><p style="opacity:0.8;margin-top:4px">互动课堂 · Cram Engine 导出</p></div>
<div class="container">
<div class="layout">
<div class="chapter-nav" id="nav"></div>
<div id="content"></div>
</div>
</div>
<script>
const COURSE = ${courseJson};

let currentChapter = 0;
let currentSlide = 0;
let currentQuiz = 0;
let quizAnswers = {};
let quizSubmitted = false;

function render() {
  const ch = COURSE.outline.chapters[currentChapter];
  const scene = COURSE.scenes[currentChapter];
  const nav = document.getElementById('nav');
  nav.innerHTML = COURSE.outline.chapters.map((c, i) =>
    '<button class="' + (i === currentChapter ? 'active' : '') + '" onclick="selectChapter(' + i + ')">' +
    (i + 1) + '. ' + escapeH(c.title) + '</button>'
  ).join('');

  if (scene && scene.sceneType === 'slide-lecture' && scene.slides) {
    renderSlidePlayer(scene);
  } else if (scene && scene.sceneType === 'interactive-quiz' && scene.questions) {
    renderQuiz(scene);
  } else if (scene && scene.sceneType === 'sim-lab' && scene.htmlCode) {
    renderSimLab(scene);
  } else {
    document.getElementById('content').innerHTML = '<div class="slide-card"><p>该章节暂无可预览内容</p></div>';
  }
}

function renderSlidePlayer(scene) {
  const slide = scene.slides[currentSlide];
  const html = '<div class="slide-card"><h2>' + escapeH(slide.title) + '</h2><ul>' +
    slide.bulletPoints.map(p => '<li>' + escapeH(p) + '</li>').join('') + '</ul>' +
    (slide.voiceScript ? '<div style="margin-top:20px;padding:12px;background:#f8f9ff;border-radius:8px;font-style:italic;color:#666;border-left:3px solid #5e39e0">🎤 ' + escapeH(slide.voiceScript) + '</div>' : '') +
    '</div>' +
    '<div class="score-bar"><span>' + (currentSlide + 1) + '/' + scene.slides.length + '</span>' +
    '<div class="progress"><i style="width:' + ((currentSlide + 1) / scene.slides.length * 100) + '%"></i></div></div>' +
    '<div style="display:flex;gap:8px">' +
    '<button class="btn" onclick="prevSlide()" ' + (currentSlide === 0 ? 'disabled' : '') + '>◀ 上一页</button>' +
    '<button class="btn btn-primary" onclick="nextSlide()" ' + (currentSlide >= scene.slides.length - 1 ? 'disabled' : '') + '>下一页 ▶</button>' +
    '</div>';
  document.getElementById('content').innerHTML = html;
}

function renderQuiz(scene) {
  const q = scene.questions[currentQuiz];
  const answered = Object.keys(quizAnswers).length;
  let optsHtml = '';
  if (q.options) {
    optsHtml = q.options.map(o => {
      let cls = 'quiz-option';
      if (quizSubmitted && o.key === q.answer) cls += ' correct';
      else if (quizSubmitted && quizAnswers[q.id] === o.key && o.key !== q.answer) cls += ' wrong';
      else if (quizAnswers[q.id] === o.key) cls += ' selected';
      return '<div class="' + cls + '" onclick="answerQuiz(\'' + q.id + '\',\'' + o.key + '\')">' +
        '<span style="width:28px;height:28px;border-radius:50%;background:' + (quizAnswers[q.id] === o.key ? '#5e39e0' : '#eee') + ';color:' + (quizAnswers[q.id] === o.key ? '#fff' : '#333') + ';display:flex;align-items:center;justify-content:center;font-weight:700">' + o.key + '</span>' +
        escapeH(o.text) + '</div>';
    }).join('');
  } else {
    optsHtml = '<textarea id="saInput" style="width:100%;min-height:80px;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px" placeholder="输入你的答案...">' + (quizAnswers[q.id] || '') + '</textarea>';
  }

  const html = '<div class="slide-card"><div style="display:flex;gap:8px;margin-bottom:12px">' +
    '<span style="background:#f0f0ff;padding:3px 8px;border-radius:4px;font-size:11px">' + (q.type === 'single-choice' ? '单选' : q.type === 'multi-choice' ? '多选' : '简答') + '</span>' +
    '<span style="background:#f0f0ff;padding:3px 8px;border-radius:4px;font-size:11px">' + q.difficulty + '</span>' +
    '<span style="background:#f0f0ff;padding:3px 8px;border-radius:4px;font-size:11px">' + escapeH(q.knowledgePoint) + '</span></div>' +
    '<h3 style="font-size:16px;margin-bottom:16px">' + escapeH(q.stem) + '</h3>' + optsHtml +
    (quizSubmitted ? '<div style="margin-top:12px;padding:12px;background:#e8f5e9;border-radius:8px"><strong>✅ 答案：' + escapeH(q.answer) + '</strong><p>' + escapeH(q.explanation || '') + '</p></div>' : '') +
    '</div>' +
    '<div class="score-bar"><span>' + (currentQuiz + 1) + '/' + scene.questions.length + '</span><span>已答 ' + answered + '/' + scene.questions.length + '</span></div>' +
    '<div style="display:flex;gap:8px"><button class="btn" onclick="prevQuiz()" ' + (currentQuiz === 0 ? 'disabled' : '') + '>◀ 上一题</button>' +
    (answered === scene.questions.length && !quizSubmitted ? '<button class="btn btn-primary" onclick="submitQuiz()">📝 提交</button>' : '') +
    '<button class="btn" onclick="nextQuiz()" ' + (currentQuiz >= scene.questions.length - 1 ? 'disabled' : '') + '>下一题 ▶</button></div>';
  document.getElementById('content').innerHTML = html;
}

function renderSimLab(scene) {
  document.getElementById('content').innerHTML =
    '<div class="slide-card"><h2>' + escapeH(scene.title) + '</h2><p style="color:#666">' + escapeH(scene.description) + '</p></div>' +
    '<iframe class="sim-frame" srcdoc="' + scene.htmlCode.replace(/"/g, '&quot;') + '" sandbox="allow-scripts allow-same-origin"></iframe>';
}

function selectChapter(i) { currentChapter = i; currentSlide = 0; currentQuiz = 0; quizAnswers = {}; quizSubmitted = false; render(); }
function prevSlide() { if (currentSlide > 0) currentSlide--; render(); }
function nextSlide() { const s = COURSE.scenes[currentChapter]; if (s && s.slides && currentSlide < s.slides.length - 1) currentSlide++; render(); }
function prevQuiz() { if (currentQuiz > 0) currentQuiz--; render(); }
function nextQuiz() { const s = COURSE.scenes[currentChapter]; if (s && s.questions && currentQuiz < s.questions.length - 1) currentQuiz++; render(); }
function answerQuiz(qid, key) { if (quizSubmitted) return; quizAnswers[qid] = key; render(); }
function submitQuiz() { quizSubmitted = true; render(); }
function escapeH(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

render();
</script>
</body>
</html>`;

  await writeFile(htmlPath, html, 'utf8');
  return htmlPath;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
