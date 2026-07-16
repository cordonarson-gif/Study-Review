/**
 * QuestionImportPanel — 多格式题目录入面板
 * 支持三个入口：文本粘贴、文件上传、图片 OCR
 * 统一汇聚到题目预览修正区，确认后入库
 */

import { useState } from 'react';
import type { ImportTab, QuestionDraft, ReviewQuestion } from '../lib/types';

type Props = {
  activeProjectId: string;
  /** 确认入库后回调，返回更新后的题目列表 */
  onQuestionsAdded: (questions: ReviewQuestion[]) => void;
  /** 通知父组件状态变更 */
  onStatus: (msg: string) => void;
};

export default function QuestionImportPanel({ activeProjectId, onQuestionsAdded, onStatus }: Props) {
  const [activeTab, setActiveTab] = useState<ImportTab>('text');
  const [textInput, setTextInput] = useState('');
  const [questionBankName, setQuestionBankName] = useState('本次导入题库');
  const [drafts, setDrafts] = useState<QuestionDraft[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  function withQuestionBank(items: QuestionDraft[], fallbackName = questionBankName) {
    const bankName = (fallbackName || questionBankName || '本次导入题库').trim();
    return items.map((draft) => ({
      ...draft,
      questionBankName: draft.questionBankName || bankName,
      sourceName: draft.sourceName || bankName
    }));
  }

  /** 文本粘贴 → 解析预览 */
  async function handleTextPreview() {
    if (!textInput.trim()) return;
    setIsProcessing(true);
    try {
      const result = withQuestionBank(
        await window.cramEngine.previewQuestionsFromText(textInput, 'text', questionBankName || '文本粘贴录入')
      );
      setDrafts(result);
      onStatus(`已识别 ${result.length} 道题目，可在下方修正后入库。`);
    } catch (err) {
      onStatus(err instanceof Error ? err.message : '解析失败');
    } finally {
      setIsProcessing(false);
    }
  }

  /** 文件上传 → 解析预览 */
  async function handleFileImport() {
    const selected = await window.cramEngine.selectUploadFiles();
    if (!selected.length) return;
    setIsProcessing(true);
    try {
      const result = withQuestionBank(await window.cramEngine.previewQuestionsFromFileContent(selected), questionBankName);
      setDrafts((prev) => [...prev, ...result]);
      onStatus(`已从 ${selected.length} 个文件中识别 ${result.length} 道题目。`);
    } catch (err) {
      onStatus(err instanceof Error ? err.message : '文件解析失败');
    } finally {
      setIsProcessing(false);
    }
  }

  /** 图片上传 → OCR 解析 → 题目识别 */
  async function handleImageImport() {
    const selected = await window.cramEngine.selectUploadFiles();
    if (!selected.length) return;
    setIsProcessing(true);
    try {
      const ocrResults = await window.cramEngine.ocrImages(selected);
      let total = 0;
      for (const { path, text } of ocrResults) {
        if (!text.trim()) continue;
        const fileName = path.split(/[\\/]/).pop() || path;
        const result = withQuestionBank(await window.cramEngine.previewQuestionsFromText(text, 'image', fileName), questionBankName || fileName);
        setDrafts((prev) => [...prev, ...result]);
        total += result.length;
      }
      onStatus(`已从 ${selected.length} 张图片中识别 ${total} 道题目。`);
    } catch (err) {
      onStatus(err instanceof Error ? err.message : '图片识别失败');
    } finally {
      setIsProcessing(false);
    }
  }

  /** 更新单道草稿 */
  function updateDraft(index: number, patch: Partial<QuestionDraft>) {
    setDrafts((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d))
    );
  }

  /** 删除单道草稿 */
  function removeDraft(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  /** 确认入库 */
  async function handleConfirm() {
    if (!drafts.length) return;
    try {
      const questions = await window.cramEngine.addQuestions(activeProjectId, withQuestionBank(drafts));
      onQuestionsAdded(questions);
      setDrafts([]);
      setTextInput('');
      onStatus(`已写入 ${drafts.length} 道题目，题库「${questionBankName || '本次导入题库'}」已更新。`);
    } catch (err) {
      onStatus(err instanceof Error ? err.message : '入库失败');
    }
  }

  const tabConfig: { key: ImportTab; label: string; icon: string; desc: string }[] = [
    { key: 'text', label: '文本粘贴', icon: '📋', desc: '粘贴题目文本，自动拆分为单道题目' },
    { key: 'file', label: '文件上传', icon: '📁', desc: '支持 txt / md / json / csv / yaml 格式' },
    { key: 'image', label: '图片 OCR', icon: '🖼️', desc: '上传图片自动识别题目文字' }
  ];

  return (
    <div className="import-page">
      <div className="section-title">多格式题目录入</div>

      {/* Tab 切换 */}
      <div className="import-tabs">
        {tabConfig.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? 'active' : ''}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <label className="question-draft-field wide">
        题库名称
        <input
          value={questionBankName}
          onChange={(e) => setQuestionBankName(e.target.value)}
          placeholder="例如：计算机组成原理期末卷 A / 第三章错题集"
        />
      </label>

      <div className="import-content">
        {activeTab === 'text' && (
          <div className="import-text-panel">
            <p className="muted">{tabConfig[0].desc}</p>
            <textarea
              className="import-textarea"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={`粘贴题目文本。支持常见格式：\n1. 题目内容\nA. 选项A\nB. 选项B\nC. 选项C\nD. 选项D\n答案：B\n解析：这是解析说明...`}
            />
            <button
              className="primary"
              onClick={handleTextPreview}
              disabled={isProcessing || !textInput.trim()}
            >
              {isProcessing ? '识别中...' : '🔍 识别并预览'}
            </button>
          </div>
        )}

        {activeTab === 'file' && (
          <div className="file-drop-zone" onClick={handleFileImport}>
            <span style={{ fontSize: '40px' }}>📁</span>
            <strong>点击选择文本文件</strong>
            <p className="muted">{tabConfig[2].desc}</p>
            <button disabled={isProcessing}>
              {isProcessing ? '解析中...' : '选择文件'}
            </button>
          </div>
        )}

        {activeTab === 'image' && (
          <div className="file-drop-zone" onClick={handleImageImport}>
            <span style={{ fontSize: '40px' }}>🖼️</span>
            <strong>点击选择题目图片</strong>
            <p className="muted">{tabConfig[2].desc}</p>
            <button disabled={isProcessing}>
              {isProcessing ? 'OCR 识别中...' : '选择图片'}
            </button>
          </div>
        )}
      </div>

      {/* 题目预览与修正区 */}
      <div className="draft-preview-stack">
        <div className="draft-preview-header">
          <strong>题目预览与修正</strong>
          <span className="muted">{drafts.length} 道待入库</span>
        </div>

        {drafts.length ? (
          drafts.map((draft, index) => (
            <div key={`draft-${index}`} className="draft-card">
              <div className="draft-card-header">
                <span className="draft-card-number">
                  第 {index + 1} 题 · {draft.source === 'image' ? '图片识别' : draft.source === 'file' ? '文件导入' : '文本录入'}
                </span>
                <button className="draft-remove-button" onClick={() => removeDraft(index)}>
                  ✕ 移除
                </button>
              </div>

              <label className="question-draft-field wide">
                题干
                <textarea
                  rows={2}
                  value={draft.stem}
                  onChange={(e) => updateDraft(index, { stem: e.target.value })}
                />
              </label>

              <div className="draft-card-row">
                <label className="question-draft-field">
                  题库
                  <input value={draft.questionBankName || questionBankName} onChange={(e) => updateDraft(index, { questionBankName: e.target.value })} />
                </label>
                <label className="question-draft-field">
                  知识点
                  <input value={draft.knowledgePoint} onChange={(e) => updateDraft(index, { knowledgePoint: e.target.value, category: `${e.target.value} / ${draft.questionType}` })} />
                </label>
                <label className="question-draft-field">
                  题型
                  <input value={draft.questionType} onChange={(e) => updateDraft(index, { questionType: e.target.value, category: `${draft.knowledgePoint} / ${e.target.value}` })} />
                </label>
                <label className="question-draft-field">
                  分类
                  <input value={draft.category} onChange={(e) => updateDraft(index, { category: e.target.value })} />
                </label>
                <label className="question-draft-field">
                  答案
                  <input value={draft.answer} onChange={(e) => updateDraft(index, { answer: e.target.value })} />
                </label>
              </div>

              <label className="question-draft-field wide">
                解析
                <textarea
                  rows={2}
                  value={draft.explanation}
                  onChange={(e) => updateDraft(index, { explanation: e.target.value })}
                />
              </label>
            </div>
          ))
        ) : (
          <div className="muted" style={{ padding: '20px', textAlign: 'center' }}>
            还没有预览题目。从上方的文本、文件或图片入口导入题目。
          </div>
        )}

        {drafts.length > 0 && (
          <div className="draft-actions">
            <button onClick={() => setDrafts([])}>清空全部</button>
            <button className="primary" onClick={handleConfirm}>
              ✅ 确认入库（{drafts.length} 题）
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
