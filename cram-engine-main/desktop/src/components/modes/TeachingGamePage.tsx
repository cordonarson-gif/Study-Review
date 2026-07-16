import { useEffect, useMemo, useState } from 'react';
import type { ReviewQuestion } from '../../lib/types';
import { getPlayableQuestions } from '../../lib/advancedModeWorkspaces.js';

type TeachingGamePageProps = {
  questions: ReviewQuestion[];
  onGoToBank: () => void;
};

export function TeachingGamePage({ questions, onGoToBank }: TeachingGamePageProps) {
  const playableQuestions = useMemo(() => getPlayableQuestions(questions), [questions]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedKey, setSelectedKey] = useState('');
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const question = playableQuestions[questionIndex] ?? null;

  useEffect(() => {
    setQuestionIndex(0);
    setSelectedKey('');
    setAnswered(false);
    setScore(0);
    setFinished(false);
  }, [questions]);

  function submitAnswer() {
    if (!question || !selectedKey || answered) return;
    setAnswered(true);
    if (selectedKey === question.answer) setScore((current) => current + 1);
  }

  function continueGame() {
    if (questionIndex >= playableQuestions.length - 1) {
      setFinished(true);
      return;
    }
    setQuestionIndex((index) => index + 1);
    setSelectedKey('');
    setAnswered(false);
  }

  function restart() {
    setQuestionIndex(0);
    setSelectedKey('');
    setAnswered(false);
    setScore(0);
    setFinished(false);
  }

  if (!playableQuestions.length) {
    return (
      <section className="panel specialized-mode-page teaching-game-page">
        <div className="page-section-header"><div><div className="section-title">教学游戏</div><h3>课堂挑战</h3></div></div>
        <div className="game-empty-state">
          <strong>还没有可游玩的题目</strong>
          <p className="muted">题目需要至少两个有效选项，并且答案与选项标识一致。</p>
          <button className="primary" onClick={onGoToBank}>去题库准备题目</button>
        </div>
      </section>
    );
  }

  if (finished) {
    return (
      <section className="panel specialized-mode-page teaching-game-page">
        <div className="game-result-state">
          <span className="section-title">挑战完成</span>
          <strong>{score} / {playableQuestions.length}</strong>
          <p>正确率 {Math.round((score / playableQuestions.length) * 100)}%</p>
          <button className="primary" onClick={restart}>重新开始</button>
        </div>
      </section>
    );
  }

  const correct = selectedKey === question?.answer;
  const progress = Math.round(((questionIndex + 1) / playableQuestions.length) * 100);

  return (
    <section className="panel specialized-mode-page teaching-game-page">
      <div className="game-status-row">
        <div><span>进度</span><strong>{questionIndex + 1} / {playableQuestions.length}</strong></div>
        <div><span>得分</span><strong>{score}</strong></div>
        <button onClick={restart}>重新开始</button>
      </div>
      <div className="game-progress-track"><i style={{ width: `${progress}%` }} /></div>

      <div className="game-question-stage">
        <span className="upload-kind">{question.knowledgePoint || question.category || '课堂挑战'}</span>
        <h3>{question.stem}</h3>
        <div className="game-option-list">
          {question.options.map((option) => {
            const optionIsCorrect = answered && option.key === question.answer;
            const optionIsWrong = answered && option.key === selectedKey && option.key !== question.answer;
            return (
              <button
                key={option.key}
                className={`game-option${selectedKey === option.key ? ' selected' : ''}${optionIsCorrect ? ' correct' : ''}${optionIsWrong ? ' wrong' : ''}`}
                onClick={() => !answered && setSelectedKey(option.key)}
                disabled={answered}
              >
                <span>{option.key}</span><strong>{option.text}</strong>
              </button>
            );
          })}
        </div>

        {answered && (
          <div className={correct ? 'game-feedback correct' : 'game-feedback wrong'} role="status">
            <strong>{correct ? '回答正确' : `正确答案：${question.answer}`}</strong>
            {question.explanation && <p>{question.explanation}</p>}
          </div>
        )}

        <div className="panel-actions horizontal">
          {!answered ? (
            <button className="primary" onClick={submitAnswer} disabled={!selectedKey}>确认答案</button>
          ) : (
            <button className="primary" onClick={continueGame}>{questionIndex === playableQuestions.length - 1 ? '查看成绩' : '下一题'}</button>
          )}
        </div>
      </div>
    </section>
  );
}
