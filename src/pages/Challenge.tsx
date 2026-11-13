import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAtlas } from "../app/state";
import { challenges } from "../content/challenges";
import type {
  ChallengeAttempt,
  ChallengeAnswer,
  ChallengeQuestion,
} from "../features/challenge/model";
import {
  startChallenge,
  answerChallenge,
  finishChallenge,
  challengeSummary,
} from "../lib/storage/challengeRepository";
import { PageTitle } from "./Pages";
import { Speak } from "../components/Speak";
export function ChallengePage() {
  const { id = "" } = useParams();
  if (!challenges[id])
    return (
      <section className="card">
        <h1>这节课尚无挑战内容</h1>
        <Link className="button primary" to="/learn">
          返回课程地图
        </Link>
      </section>
    );
  return <ChallengeRunner key={id} id={id} />;
}
function ChallengeRunner({ id }: { id: string }) {
  const lesson = challenges[id];
  const { data, refresh } = useAtlas();
  const records = (data?.challenges ?? []).filter((a) => a.lessonId === id);
  const active = records.find((a) => !a.finishedAt);
  const latest = records
    .filter((a) => a.finishedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const [attempt, setAttempt] = useState<ChallengeAttempt | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const question = lesson.questions[index];
  const saved = attempt?.answers.find(
    (a) => a.questionId === question.questionId,
  );
  useEffect(() => {
    heading.current?.focus();
  }, [attempt?.attemptId, attempt?.finishedAt, index]);
  async function run(action: () => Promise<ChallengeAttempt>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const value = await action();
      await refresh();
      setAttempt(value);
      return value;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败，请重试。");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function begin() {
    const next = await run(() => startChallenge(id));
    if (next) setIndex(Math.max(0, next.answers.length - 1));
  }
  async function next() {
    if (!attempt) return;
    if (index === lesson.questions.length - 1)
      await run(() => finishChallenge(attempt.attemptId));
    else setIndex((i) => i + 1);
  }
  const summary = attempt ? challengeSummary(attempt) : null;
  return (
    <>
      <div className="lesson-top">
        <Link to={`/lesson/${id}`}>← 基础课程</Link>
        <span className="tag">{id} · 可选 · 独立记录</span>
      </div>
      <PageTitle
        eyebrow="EXTRA FIELDWORK · 巩固与迁移"
        title={`${id} · 可选进阶挑战`}
      >
        {lesson.title}。不替代基础路径，不计入课程通过次数。
      </PageTitle>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!attempt ? (
        <>
          <section className="card lesson-intro">
            <h2>把认识的词句，用出来</h2>
            <p>{lesson.notes}</p>
            <p>6 道可判分题 + 1 项自主表达。逐项保存，离开后可恢复。</p>
            <p className="caption">
              封闭题有明确要求；自由表达不按固定字符串自动判错。挑战成绩不覆盖任何基础成绩，不代表长期掌握。
            </p>
            <div className="actions">
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void begin()}
              >
                {busy ? "正在读取…" : active ? "恢复挑战 →" : "开始可选挑战 →"}
              </button>
              {latest && (
                <button
                  className="button secondary"
                  onClick={() => setAttempt(latest)}
                >
                  查看上次挑战
                </button>
              )}
            </div>
          </section>
          <section className="card listening-selfcheck">
            <span className="eyebrow">听读自检 · 不计分</span>
            <h2>先听一遍，再自己说一遍</h2>
            <p>
              合成示范尚待人工审音，不用于自动听辨判分。听不到声音时，可展开文本继续学习，不会被计错。
            </p>
            <Speak text={lesson.audioText} label="播放示范（不计分）" />
            <details>
              <summary>显示示范文本与跟读提示</summary>
              <p lang="en">{lesson.audioText}</p>
              <p>
                {id === "L01"
                  ? "听读的是字母名称，不是单词音素。试着在字母表中找到它，并区分大小写。"
                  : "先模仿，再把 student 换成其他课内身份词。这里只自行跟读，没有录音识别或口语评分。"}
              </p>
            </details>
          </section>
        </>
      ) : attempt.finishedAt ? (
        <section className="card result challenge-result">
          <span className="result-badge">✦</span>
          <h2 ref={heading} tabIndex={-1}>
            本次挑战已记录
          </h2>
          <p>
            封闭练习：答对 {summary?.correct} / {summary?.total} 题
          </p>
          <p>
            自主表达：
            {summary?.output?.selfRating === "independent"
              ? "自评能独立完成"
              : "自评还需练习"}
            （未自动评分）
          </p>
          <p className="saved">✓ 挑战记录已保存到本机</p>
          <p className="caption">
            与基础课程成绩分别记录；没有增加基础完成次数、接触条目或掌握度。
          </p>
          <details>
            <summary>回看本次答案与解释</summary>
            {attempt.answers.map((answer) => {
              const q = lesson.questions.find(
                (q) => q.questionId === answer.questionId,
              )!;
              return (
                <div className="answer-record" key={q.questionId}>
                  <strong>{q.prompt}</strong>
                  <p className="preserve-lines">你的答案：{answer.answer}</p>
                  <p>{q.type === "output" ? q.reference : q.explanation}</p>
                  <p>
                    {answer.correct === null
                      ? "自主表达未自动评分"
                      : answer.correct
                        ? "✓ 回答正确"
                        : "需要再练习"}
                  </p>
                </div>
              );
            })}
          </details>
          <div className="actions">
            <Link className="button primary" to={`/lesson/${id}`}>
              回到基础课程
            </Link>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void begin()}
            >
              再挑战一次
            </button>
          </div>
        </section>
      ) : (
        <>
          <div className="lesson-progress">
            <span>
              挑战 {index + 1} / {lesson.questions.length} ·{" "}
              {question.type === "output" ? "自主表达，不自动评分" : "巩固练习"}
            </span>
            <progress
              max={lesson.questions.length}
              value={attempt.answers.length}
              aria-label="挑战进度"
            />
          </div>
          <section className="card exercise">
            <h2 tabIndex={-1} ref={heading}>
              {question.prompt}
            </h2>
            <ChallengeExercise
              key={question.questionId}
              question={question}
              saved={saved}
              busy={busy}
              onSubmit={(answer, rating) =>
                void run(() =>
                  answerChallenge(
                    attempt.attemptId,
                    question.questionId,
                    answer,
                    rating,
                  ),
                )
              }
            />
            {saved && (
              <>
                <div
                  className={`feedback ${saved.correct === false ? "incorrect" : "correct"}`}
                  role="status"
                >
                  <strong>
                    {saved.correct === null
                      ? "输出已保存（未自动评分）"
                      : saved.correct
                        ? "✓ 回答正确"
                        : "再看一下这个要点"}
                  </strong>
                  <p className="preserve-lines">你的答案：{saved.answer}</p>
                  <p>
                    {question.type === "output"
                      ? question.reference
                      : question.explanation}
                  </p>
                  {saved.correct === false && question.type !== "output" && (
                    <p>参考答案：{question.answers[0]}</p>
                  )}
                  <p className="caption">本项已保存，不会重复计分。</p>
                </div>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => void next()}
                >
                  {busy
                    ? "正在保存…"
                    : index === lesson.questions.length - 1
                      ? "完成挑战 →"
                      : "下一项 →"}
                </button>
              </>
            )}
          </section>
        </>
      )}
    </>
  );
}
function ChallengeExercise({
  question,
  saved,
  busy,
  onSubmit,
}: {
  question: ChallengeQuestion;
  saved?: ChallengeAnswer;
  busy: boolean;
  onSubmit: (answer: string, rating?: ChallengeAnswer["selfRating"]) => void;
}) {
  const [value, setValue] = useState("");
  const [rating, setRating] = useState<ChallengeAnswer["selfRating"]>();
  const submitted = !!saved;
  const output = question.type === "output";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy && !submitted && value.trim() && (!output || rating))
          onSubmit(value, rating);
      }}
    >
      {question.type === "choice" ? (
        <fieldset disabled={submitted || busy}>
          <legend>选择一个答案</legend>
          {question.options!.map((option) => (
            <label className="option" key={option}>
              <input
                type="radio"
                name={question.questionId}
                checked={(saved?.answer ?? value) === option}
                onChange={() => setValue(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <>
          <label className="input-label" htmlFor="challenge-answer">
            {output ? "你的自主表达" : "你的挑战答案"}
          </label>
          {output ? (
            <textarea
              id="challenge-answer"
              lang="en"
              rows={5}
              maxLength={500}
              value={saved?.answer ?? value}
              onChange={(e) => setValue(e.target.value)}
              disabled={submitted || busy}
              autoComplete="off"
              spellCheck={false}
            />
          ) : (
            <input
              id="challenge-answer"
              type="text"
              lang="en"
              maxLength={500}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              value={saved?.answer ?? value}
              onChange={(e) => setValue(e.target.value)}
              disabled={submitted || busy}
            />
          )}
        </>
      )}
      {output && (
        <div className="output-rubric">
          <p>参考：{question.reference}</p>
          <ul>
            {question.checkpoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <fieldset disabled={submitted || busy}>
            <legend>对照要点，自行评价（不影响基础成绩）</legend>
            <label className="option">
              <input
                type="radio"
                name="self-rating"
                checked={(saved?.selfRating ?? rating) === "practice"}
                onChange={() => setRating("practice")}
              />
              还需练习
            </label>
            <label className="option">
              <input
                type="radio"
                name="self-rating"
                checked={(saved?.selfRating ?? rating) === "independent"}
                onChange={() => setRating("independent")}
              />
              能独立完成
            </label>
          </fieldset>
        </div>
      )}
      {!submitted && (
        <button
          className="button primary"
          type="submit"
          disabled={busy || !value.trim() || (output && !rating)}
        >
          {busy ? "正在保存…" : output ? "保存表达与自评" : "检查挑战答案"}
        </button>
      )}
    </form>
  );
}
