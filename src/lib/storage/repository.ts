import { openDB, type DBSchema } from "idb";
import { lessons } from "../../content/lessons";
import { grade, result } from "../../features/lesson/grading";
export const schemaVersion = 1;
export interface Settings {
  dailyTargetMinutes: number;
  speechRate: number;
  updatedAt: string;
}
export interface Progress {
  lessonId: string;
  passed: boolean;
  bestScore: number;
  attempts: number;
  updatedAt: string;
  completedAt?: string;
}
export interface Answer {
  questionId: string;
  answer: string;
  correct: boolean;
  answeredAt: string;
}
export interface Attempt {
  attemptId: string;
  lessonId: string;
  cardIndex: number;
  stage: "teaching" | "practice" | "result";
  answers: Answer[];
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
}
export interface Seen {
  itemId: string;
  seenAt: string;
}
interface AtlasDB extends DBSchema {
  settings: { key: string; value: Settings };
  lessonProgress: { key: string; value: Progress };
  exerciseAttempts: { key: string; value: Attempt };
  seenItems: { key: string; value: Seen };
}
const now = () => new Date().toISOString();
export const defaults: Settings = {
  dailyTargetMinutes: 15,
  speechRate: 0.85,
  updatedAt: "",
};
export function database() {
  return openDB<AtlasDB>("english-atlas-m1", schemaVersion, {
    upgrade(db) {
      db.createObjectStore("settings");
      db.createObjectStore("lessonProgress", { keyPath: "lessonId" });
      db.createObjectStore("exerciseAttempts", { keyPath: "attemptId" });
      db.createObjectStore("seenItems", { keyPath: "itemId" });
    },
  });
}
export async function snapshot() {
  const db = await database();
  const tx = db.transaction([
    "settings",
    "lessonProgress",
    "exerciseAttempts",
    "seenItems",
  ]);
  const [settings, progress, attempts, seen] = await Promise.all([
    tx.objectStore("settings").get("preferences"),
    tx.objectStore("lessonProgress").getAll(),
    tx.objectStore("exerciseAttempts").getAll(),
    tx.objectStore("seenItems").getAll(),
  ]);
  await tx.done;
  return { settings: settings ?? defaults, progress, attempts, seen };
}
export async function saveSettings(settings: Settings) {
  const db = await database();
  await db.put("settings", { ...settings, updatedAt: now() }, "preferences");
}
export async function startAttempt(lessonId: string) {
  if (!lessons[lessonId]) throw Error("课程尚未开放");
  const db = await database();
  const tx = db.transaction("exerciseAttempts", "readwrite");
  const all = await tx.store.getAll();
  let attempt = all.find((a) => a.lessonId === lessonId && !a.finishedAt);
  if (!attempt) {
    attempt = {
      attemptId:
        crypto.randomUUID?.() ??
        Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join(""),
      lessonId,
      cardIndex: 0,
      stage: "teaching",
      answers: [],
      startedAt: now(),
      updatedAt: now(),
    };
    await tx.store.add(attempt);
  }
  await tx.done;
  return attempt;
}
export async function advanceCard(attemptId: string) {
  const db = await database();
  const tx = db.transaction(["exerciseAttempts", "seenItems"], "readwrite");
  const store = tx.objectStore("exerciseAttempts");
  const attempt = await store.get(attemptId);
  if (!attempt) throw Error("找不到本次学习记录");
  if (attempt.stage === "teaching") {
    const lesson = lessons[attempt.lessonId];
    const card = lesson.cards[attempt.cardIndex];
    for (const itemId of card.itemIds) {
      if (!(await tx.objectStore("seenItems").get(itemId)))
        await tx.objectStore("seenItems").put({ itemId, seenAt: now() });
    }
    if (attempt.cardIndex + 1 < lesson.cards.length) attempt.cardIndex++;
    else attempt.stage = "practice";
    attempt.updatedAt = now();
    await store.put(attempt);
  }
  await tx.done;
  return attempt;
}
export async function answerQuestion(
  attemptId: string,
  questionId: string,
  answer: string,
) {
  const db = await database();
  const tx = db.transaction("exerciseAttempts", "readwrite");
  const attempt = await tx.store.get(attemptId);
  if (!attempt) throw Error("找不到本次练习");
  if (
    !attempt.finishedAt &&
    !attempt.answers.some((a) => a.questionId === questionId)
  ) {
    const question =
      lessons[attempt.lessonId].questions[attempt.answers.length];
    if (attempt.stage !== "practice" || question?.questionId !== questionId)
      throw Error("答题顺序不正确，请刷新恢复");
    attempt.answers.push({
      questionId,
      answer,
      correct: grade(question, answer),
      answeredAt: now(),
    });
    attempt.updatedAt = now();
    await tx.store.put(attempt);
  }
  await tx.done;
  return attempt;
}
export async function finishAttempt(attemptId: string) {
  const db = await database();
  const tx = db.transaction(
    ["exerciseAttempts", "lessonProgress"],
    "readwrite",
  );
  const store = tx.objectStore("exerciseAttempts");
  const attempt = await store.get(attemptId);
  if (!attempt) throw Error("找不到本次练习");
  if (!attempt.finishedAt) {
    const lesson = lessons[attempt.lessonId];
    if (attempt.answers.length !== lesson.questions.length)
      throw Error("请先完成全部练习");
    const { score, passed } = result(
      attempt.answers.filter((a) => a.correct).length,
      lesson.questions.length,
    );
    const old = await tx.objectStore("lessonProgress").get(attempt.lessonId);
    const date = now();
    await tx.objectStore("lessonProgress").put({
      lessonId: attempt.lessonId,
      passed: !!old?.passed || passed,
      bestScore: Math.max(old?.bestScore ?? 0, score),
      attempts: (old?.attempts ?? 0) + 1,
      updatedAt: date,
      completedAt: old?.completedAt ?? (passed ? date : undefined),
    });
    attempt.finishedAt = date;
    attempt.updatedAt = date;
    attempt.stage = "result";
    await store.put(attempt);
  }
  await tx.done;
  return attempt;
}
