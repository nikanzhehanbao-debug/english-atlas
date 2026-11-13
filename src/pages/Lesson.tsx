import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAtlas } from "../app/state";
import { alphabet, lessons } from "../content/lessons";
import type { Lesson as ContentLesson, Question } from "../content/schema";
import {
  startAttempt,
  advanceCard,
  answerQuestion,
  finishAttempt,
  type Attempt,
} from "../lib/storage/repository";
import { result } from "../features/lesson/grading";
import { Speak } from "../components/Speak";
import { PageTitle } from "./Pages";
export function LessonPage() {
  const { id = "" } = useParams();
  if (!lessons[id])
    return (
      <>
        <PageTitle eyebrow="课程暂不可用" title="这片小岛还没有开放" />
        <section className="card">
          <p>本轮仅 L01、L04 可学习。其他课程不会记录完成状态。</p>
          <Link className="button primary" to="/learn">
            返回课程地图
          </Link>
        </section>
      </>
    );
  return <LessonRunner key={id} lesson={lessons[id]} />;
}
function LessonRunner({ lesson }: { lesson: ContentLesson }) {
  const { data, refresh } = useAtlas();
  const existing = data?.attempts.find(
    (a) => a.lessonId === lesson.lessonId && !a.finishedAt,
  );
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [attempt?.stage, attempt?.cardIndex, questionIndex]);
  async function run(action: () => Promise<Attempt>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await action();
      setAttempt(next);
      await refresh();
      return next;
    } catch {
      setError(
        "学习记录保存失败，本步尚未确认。请检查浏览器存储权限后重试，或刷新读取上次成功保存的位置。",
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function begin() {
    const next = await run(() => startAttempt(lesson.lessonId));
    if (next) {
      setQuestionIndex(Math.max(0, next.answers.length - 1));
    }
  }
  async function nextQuestion() {
    if (!attempt) return;
    if (questionIndex === lesson.questions.length - 1) {
      await run(() => finishAttempt(attempt.attemptId));
    } else {
      setQuestionIndex((index) => index + 1);
    }
  }
  const saved = attempt?.answers.find(
    (a) => a.questionId === lesson.questions[questionIndex]?.questionId,
  );
  const score = attempt
    ? result(
        attempt.answers.filter((a) => a.correct).length,
        lesson.questions.length,
      )
    : null;
  return (
    <>
      <div className="lesson-top">
        <Link to="/learn">← 课程地图</Link>
        <span className="tag">
          {lesson.lessonId}
          {lesson.lessonId === "L04" ? " · 体验课程" : " · 发音起点"}
        </span>
      </div>
      <PageTitle eyebrow="LEARN AT YOUR OWN PACE" title={lesson.title}>
        {lesson.subtitle}
      </PageTitle>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!attempt ? (
        <section className="card lesson-intro">
          <span className="eyebrow">这节课，你将学会</span>
          <ul className="goals">
            {lesson.goals.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          <p>
            {lesson.cards.length} 张教学卡 · {lesson.questions.length}{" "}
            道混合练习 · 达到 80% 通过
          </p>
          <p className="caption">
            教学卡和每次答题都会保存。可以随时离开，再回来继续。本次测验不做听力辨音或口语评分。
          </p>
          {data?.progress.find((p) => p.lessonId === lesson.lessonId) && (
            <p>
              历史最好成绩：
              {
                data.progress.find((p) => p.lessonId === lesson.lessonId)
                  ?.bestScore
              }
              % · 已结算{" "}
              {
                data.progress.find((p) => p.lessonId === lesson.lessonId)
                  ?.attempts
              }{" "}
              次
            </p>
          )}
          <button
            className="button primary"
            onClick={() => void begin()}
            disabled={busy}
          >
            {busy
              ? "正在读取…"
              : existing
                ? "恢复本次学习 →"
                : "开始本次学习 →"}
          </button>
        </section>
      ) : (
        <>
          <div className="lesson-progress">
            <span>
              {attempt.stage === "teaching"
                ? `新知 · ${attempt.cardIndex + 1} / ${lesson.cards.length}`
                : attempt.stage === "practice"
                  ? `练习 · ${questionIndex + 1} / ${lesson.questions.length}`
                  : "本次学习已结算"}
            </span>
            <progress
              max={lesson.cards.length + lesson.questions.length}
              value={
                attempt.stage === "teaching"
                  ? attempt.cardIndex
                  : lesson.cards.length + attempt.answers.length
              }
              aria-label="本次课程进度"
            />
          </div>
          {attempt.stage === "teaching" ? (
            <section className="card teaching">
              <span className="eyebrow">
                FIELD NOTE / 0{attempt.cardIndex + 1}
              </span>
              <h2 tabIndex={-1} ref={heading}>
                {lesson.cards[attempt.cardIndex].title}
              </h2>
              <p className="teaching-text">
                {lesson.cards[attempt.cardIndex].text}
              </p>
              {lesson.cards[attempt.cardIndex].alphabet && (
                <>
                  <div className="alphabet-grid">
                    {alphabet.map((letter) => (
                      <div key={letter}>
                        <strong lang="en">
                          {letter} <span>{letter.toLowerCase()}</span>
                        </strong>
                        <Speak text={letter} label={`读 ${letter}`} />
                      </div>
                    ))}
                  </div>
                  <p className="notice">
                    字母优先播放本站合成示范，含 “The letter…”
                    引导；静态音频和设备回退语音都需实听复核。本轮不据此进行听音判分。
                  </p>
                </>
              )}
              {lesson.lessonId === "L04" && (
                <div className="core-words">
                  {lesson.items
                    .filter((item) =>
                      lesson.cards[attempt.cardIndex].itemIds.includes(
                        item.itemId,
                      ),
                    )
                    .map((item) => (
                      <div className="core-word" key={item.itemId}>
                        <span lang="en">
                          {item.term}
                          <small lang="zh-CN">{item.meaning}</small>
                        </span>
                        <Speak text={item.term} />
                      </div>
                    ))}
                </div>
              )}
              {lesson.cards[attempt.cardIndex].examples.map((ex) => (
                <div className="example example-row" key={ex.en}>
                  <div>
                    <p lang="en">{ex.en}</p>
                    <p className="muted">{ex.zh}</p>
                  </div>
                  <Speak text={ex.en} />
                </div>
              ))}
              <p className="caption">
                点播后可自行跟读；播放不代表发音已通过评估。
              </p>
              <button
                disabled={busy}
                className="button primary"
                onClick={() => void run(() => advanceCard(attempt.attemptId))}
              >
                {busy
                  ? "正在保存…"
                  : attempt.cardIndex === lesson.cards.length - 1
                    ? "已阅读，开始练习 →"
                    : "已阅读这张卡，继续 →"}
              </button>
            </section>
          ) : attempt.stage === "practice" ? (
            <section className="card exercise">
              <span className="eyebrow">
                PRACTICE / {String(questionIndex + 1).padStart(2, "0")}
              </span>
              <h2 tabIndex={-1} ref={heading}>
                {lesson.questions[questionIndex].prompt}
              </h2>
              <Exercise
                key={lesson.questions[questionIndex].questionId}
                question={lesson.questions[questionIndex]}
                busy={busy}
                savedAnswer={saved?.answer}
                onSubmit={(answer) =>
                  void run(() =>
                    answerQuestion(
                      attempt.attemptId,
                      lesson.questions[questionIndex].questionId,
                      answer,
                    ),
                  )
                }
              />
              {saved && (
                <div
                  className={`feedback ${saved.correct ? "correct" : "incorrect"}`}
                  role="status"
                >
                  <strong>
                    {saved.correct ? "✓ 回答正确" : "再记住这个要点"}
                  </strong>
                  <p>
                    你的答案：<span lang="en">{saved.answer}</span>
                  </p>
                  {!saved.correct && (
                    <p>
                      参考答案：
                      <span lang="en">
                        {lesson.questions[questionIndex].answers[0]}
                      </span>
                    </p>
                  )}
                  <p>{lesson.questions[questionIndex].explanation}</p>
                  <span className="caption">
                    本题答案已保存，不会重复计分。
                  </span>
                </div>
              )}
              {saved && (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => void nextQuestion()}
                >
                  {busy
                    ? "正在保存…"
                    : questionIndex === lesson.questions.length - 1
                      ? "保存并查看结果 →"
                      : "下一题 →"}
                </button>
              )}
            </section>
          ) : (
            <section className="card result">
              <span className="result-badge">{score?.passed ? "✦" : "↗"}</span>
              <p className="eyebrow">SESSION COMPLETE</p>
              <h2>
                {score?.passed ? "本次测验通过！" : "再练一次，会更熟悉。"}
              </h2>
              <strong className="score">
                {score?.score}
                <small>%</small>
              </strong>
              <p>
                答对 {attempt.answers.filter((a) => a.correct).length} /{" "}
                {lesson.questions.length} 题 · 通过线 80%
              </p>
              <p className="saved">✓ 成绩已保存到本机</p>
              <p className="caption">
                通过表示本次测验达到标准，不代表长期掌握或达到 A1。
                <br />
                复习调度将在后续版本开放。
              </p>
              <div className="actions">
                <Link className="button primary" to="/learn">
                  返回课程地图 →
                </Link>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void begin()}
                >
                  重新学习
                </button>
              </div>
              <details>
                <summary>查看本次答题记录</summary>
                {attempt.answers.map((a) => {
                  const question = lesson.questions.find(
                    (q) => q.questionId === a.questionId,
                  )!;
                  return (
                    <div className="answer-record" key={a.questionId}>
                      <strong>
                        {a.correct ? "✓" : "×"} {question.prompt}
                      </strong>
                      <p>你的答案：{a.answer}</p>
                      <p>参考：{question.answers[0]}</p>
                      <p>{question.explanation}</p>
                    </div>
                  );
                })}
              </details>
            </section>
          )}
        </>
      )}
    </>
  );
}
function Exercise({
  question,
  busy,
  savedAnswer,
  onSubmit,
}: {
  question: Question;
  busy: boolean;
  savedAnswer?: string;
  onSubmit: (value: string) => void;
}) {
  const [input, setInput] = useState("");
  const [order, setOrder] = useState<number[]>([]);
  const submitted = savedAnswer !== undefined;
  const value =
    question.type === "order"
      ? order.map((i) => question.options![i]).join(" ")
      : input;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (
          !submitted &&
          !busy &&
          value.trim() &&
          (question.type !== "order" ||
            order.length === question.options!.length)
        )
          onSubmit(value);
      }}
    >
      {question.type === "choice" ? (
        <fieldset disabled={submitted || busy}>
          <legend className="sr-only">选择一个答案</legend>
          {question.options!.map((option) => (
            <label
              className={`option ${(savedAnswer ?? input) === option ? "selected" : ""}`}
              key={option}
            >
              <input
                type="radio"
                name={question.questionId}
                checked={(savedAnswer ?? input) === option}
                onChange={() => setInput(option)}
                value={option}
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
      ) : question.type === "input" ? (
        <>
          <label className="input-label" htmlFor="answer">
            你的答案
          </label>
          <input
            id="answer"
            type="text"
            lang="en"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={savedAnswer ?? input}
            onChange={(e) => setInput(e.target.value)}
            disabled={submitted || busy}
          />
          {question.caseSensitive && (
            <p className="caption">本题区分大小写。</p>
          )}
        </>
      ) : (
        <>
          <p className="muted">依次点选词块；点选已排词块可撤回。</p>
          <div
            className="order-answer"
            aria-label="当前排列"
            aria-live="polite"
          >
            {submitted ? (
              <span>{savedAnswer}</span>
            ) : order.length ? (
              order.map((i, pos) => (
                <button
                  type="button"
                  className="word-chip"
                  disabled={busy}
                  key={i}
                  onClick={() =>
                    setOrder((o) => o.filter((_, index) => index !== pos))
                  }
                >
                  {question.options![i]} ×
                </button>
              ))
            ) : (
              <span className="muted">排列后的句子会出现在这里</span>
            )}
          </div>
          <div className="word-bank">
            {question.options!.map((word, i) => (
              <button
                className="word-chip"
                type="button"
                disabled={submitted || busy || order.includes(i)}
                key={i}
                onClick={() => setOrder((o) => [...o, i])}
              >
                {word}
              </button>
            ))}
          </div>
        </>
      )}
      {!submitted && (
        <button
          className="button primary"
          type="submit"
          disabled={
            busy ||
            !value.trim() ||
            (question.type === "order" &&
              order.length !== question.options!.length)
          }
        >
          {busy ? "正在保存…" : "检查答案"}
        </button>
      )}
    </form>
  );
}
