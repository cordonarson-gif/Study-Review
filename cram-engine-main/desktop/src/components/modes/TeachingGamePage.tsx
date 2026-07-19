import { useEffect, useMemo, useState } from 'react';
import type { ReviewQuestion } from '../../lib/types';
import { getPlayableQuestions } from '../../lib/advancedModeWorkspaces.js';
import { useT } from '../../i18n';
import { RichMathContent } from '../RichMathContent';

type TeachingGamePageProps = {
  questions: ReviewQuestion[];
  onGoToBank: () => void;
};

export function TeachingGamePage({ questions, onGoToBank }: TeachingGamePageProps) {
  const { t } = useT();
  const playableQuestions = useMemo(() => getPlayableQuestions(questions), [questions]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedKey, setSelectedKey] = useState('');
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const safeQuestionIndex = Math.min(questionIndex, Math.max(0, playableQuestions.length - 1));
  const question = playableQuestions[safeQuestionIndex] ?? null;

  useEffect(() => {
    setQuestionIndex(0);
    setSelectedKey('');
    setAnswered(false);
    setScore(0);
    setFinished(false);
  }, [playableQuestions]);

  function submitAnswer() {
    if (!question || !selectedKey || answered) return;
    setAnswered(true);
    if (selectedKey === question.answer) setScore((current) => current + 1);
  }

  function continueGame() {
    if (safeQuestionIndex >= playableQuestions.length - 1) {
      setFinished(true);
      return;
    }
    setQuestionIndex(safeQuestionIndex + 1);
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

  if (!playableQuestions.length || !question) {
    return (
      <section className="panel specialized-mode-page teaching-game-page">
        <div className="page-section-header"><div><div className="section-title">{t('game.title')}</div><h3>{t('game.challenge')}</h3></div></div>
        <div className="game-empty-state">
          <strong>{t('game.noQuestions')}</strong>
          <p className="muted">{t('game.noQuestionsDesc')}</p>
          <button className="primary" onClick={onGoToBank}>{t('game.goToBank')}</button>
        </div>
      </section>
    );
  }

  if (finished) {
    return (
      <section className="panel specialized-mode-page teaching-game-page">
        <div className="game-result-state">
          <span className="section-title">{t('game.complete')}</span>
          <strong>{score} / {playableQuestions.length}</strong>
          <p>{t('game.accuracy', { percent: Math.round((score / playableQuestions.length) * 100) })}</p>
          <button className="primary" onClick={restart}>{t('game.restart')}</button>
        </div>
      </section>
    );
  }

  const correct = selectedKey === question?.answer;
  const progress = Math.round(((safeQuestionIndex + 1) / playableQuestions.length) * 100);

  return (
    <section className="panel specialized-mode-page teaching-game-page">
      <div className="game-status-row">
        <div><span>{t('game.progressLabel')}</span><strong>{safeQuestionIndex + 1} / {playableQuestions.length}</strong></div>
        <div><span>{t('game.scoreLabel')}</span><strong>{score}</strong></div>
        <button onClick={restart}>{t('game.restart')}</button>
      </div>
      <div className="game-progress-track"><i style={{ width: `${progress}%` }} /></div>

      <div className="game-question-stage">
        <span className="upload-kind">{question.knowledgePoint || question.category || t('game.challenge')}</span>
        <RichMathContent content={question.stem} className="rich-math-content game-question-content" />
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
                <span>{option.key}</span>
                <RichMathContent content={option.text} inline className="rich-math-content game-option-content" />
              </button>
            );
          })}
        </div>

        {answered && (
          <div className={correct ? 'game-feedback correct' : 'game-feedback wrong'} role="status">
            <RichMathContent
              content={correct ? t('game.correct') : t('game.correctAnswer', { answer: question.answer })}
              inline
              className="rich-math-content game-answer-content"
            />
            {question.explanation && (
              <RichMathContent content={question.explanation} className="rich-math-content game-explanation-content" />
            )}
          </div>
        )}

        <div className="panel-actions horizontal">
          {!answered ? (
            <button className="primary" onClick={submitAnswer} disabled={!selectedKey}>{t('game.confirmAnswer')}</button>
          ) : (
            <button className="primary" onClick={continueGame}>{safeQuestionIndex === playableQuestions.length - 1 ? t('game.viewScore') : t('game.nextQuestion')}</button>
          )}
        </div>
      </div>
    </section>
  );
}
