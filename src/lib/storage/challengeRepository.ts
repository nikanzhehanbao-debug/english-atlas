import { database } from "./repository";
import { challenges, challengeContentVersion } from "../../content/challenges";
import type {
  ChallengeAttempt,
  ChallengeAnswer,
} from "../../features/challenge/model";
import { grade } from "../../features/lesson/grading";
const now = () => new Date().toISOString();
function content(lessonId: string) {
  const value = challenges[lessonId];
  if (!value) throw Error("此课程尚无挑战内容");
  return value;
}
export async function startChallenge(lessonId: string) {
  const lesson = content(lessonId);
  const db = await database();
  const tx = db.transaction("challengeAttempts", "readwrite");
  let attempt = (await tx.store.getAll()).find(
    (a) =>
      a.lessonId === lessonId &&
      a.contentVersion === challengeContentVersion &&
      !a.finishedAt,
  );
  if (!attempt) {
    attempt = {
      attemptId:
        crypto.randomUUID?.() ??
        Array.from(crypto.getRandomValues(new Uint8Array(16)), (x) =>
          x.toString(16).padStart(2, "0"),
        ).join(""),
      lessonId,
      contentVersion: 1,
      questionIds: lesson.questions.map((q) => q.questionId),
      answers: [],
      startedAt: now(),
      updatedAt: now(),
    };
    await tx.store.add(attempt);
  }
  await tx.done;
  return attempt;
}
export async function answerChallenge(
  attemptId: string,
  questionId: string,
  answer: string,
  selfRating?: ChallengeAnswer["selfRating"],
) {
  if (!answer.trim() || answer.length > 500)
    throw Error("请填写 1–500 字的答案");
  const db = await database();
  const tx = db.transaction("challengeAttempts", "readwrite");
  const attempt = await tx.store.get(attemptId);
  if (!attempt) throw Error("找不到挑战记录");
  if (
    !attempt.finishedAt &&
    !attempt.answers.some((a) => a.questionId === questionId)
  ) {
    const question = content(attempt.lessonId).questions.find(
      (q) => q.questionId === attempt.questionIds[attempt.answers.length],
    );
    if (!question || question.questionId !== questionId)
      throw Error("挑战顺序不正确，请刷新恢复");
    if (
      question.type === "output" &&
      selfRating !== "practice" &&
      selfRating !== "independent"
    )
      throw Error("请先参考要点并选择自评");
    attempt.answers.push({
      questionId,
      answer: answer.trim(),
      correct: question.type === "output" ? null : grade(question, answer),
      ...(question.type === "output" ? { selfRating } : {}),
      answeredAt: now(),
    });
    attempt.updatedAt = now();
    await tx.store.put(attempt);
  }
  await tx.done;
  return attempt;
}
export async function finishChallenge(attemptId: string) {
  const db = await database();
  const tx = db.transaction("challengeAttempts", "readwrite");
  const attempt = await tx.store.get(attemptId);
  if (!attempt) throw Error("找不到挑战记录");
  if (!attempt.finishedAt) {
    if (attempt.answers.length !== attempt.questionIds.length)
      throw Error("请先完成挑战与自评");
    attempt.finishedAt = now();
    attempt.updatedAt = attempt.finishedAt;
    await tx.store.put(attempt);
  }
  await tx.done;
  return attempt;
}
export function challengeSummary(attempt: ChallengeAttempt) {
  const closed = attempt.answers.filter((a) => a.correct !== null);
  return {
    correct: closed.filter((a) => a.correct).length,
    total: closed.length,
    output: attempt.answers.find((a) => a.correct === null),
  };
}
