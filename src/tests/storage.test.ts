import { describe, it, expect, vi } from "vitest";
import {
  database,
  snapshot,
  startAttempt,
  advanceCard,
  answerQuestion,
  finishAttempt,
  saveSettings,
} from "../lib/storage/repository";
import { lessons } from "../content/lessons";
async function complete(id: string, correctCount = 10) {
  let a = await startAttempt(id);
  for (let i = 0; i < lessons[id].cards.length; i++)
    a = await advanceCard(a.attemptId);
  for (const [i, q] of lessons[id].questions.entries())
    await answerQuestion(
      a.attemptId,
      q.questionId,
      i < correctCount ? q.answers[0] : "wrong",
    );
  return finishAttempt(a.attemptId);
}
describe("IndexedDB 真实事务与恢复", () => {
  it("设置持久化，关闭重开仍在", async () => {
    await saveSettings({
      dailyTargetMinutes: 20,
      speechRate: 0.65,
      updatedAt: "",
    });
    (await database()).close();
    expect((await snapshot()).settings).toMatchObject({
      dailyTargetMinutes: 20,
      speechRate: 0.65,
    });
  });
  it("未完成课程不算通过，已读卡片记录可恢复", async () => {
    const a = await startAttempt("L01");
    const b = await advanceCard(a.attemptId);
    const restored = await startAttempt("L01");
    expect(restored).toEqual(b);
    expect((await snapshot()).seen).toHaveLength(5);
    expect((await snapshot()).progress).toHaveLength(0);
  });
  it("并发开始与提交不会重复计分", async () => {
    const [a, b] = await Promise.all([
      startAttempt("L04"),
      startAttempt("L04"),
    ]);
    expect(a.attemptId).toBe(b.attemptId);
    for (let i = 0; i < 3; i++) await advanceCard(a.attemptId);
    const q = lessons.L04.questions[0];
    await Promise.all([
      answerQuestion(a.attemptId, q.questionId, q.answers[0]),
      answerQuestion(a.attemptId, q.questionId, "wrong"),
    ]);
    expect((await snapshot()).attempts[0].answers).toHaveLength(1);
    expect((await snapshot()).attempts[0].answers[0].correct).toBe(true);
  });
  it("不能提前结算，不能乱序答题", async () => {
    const a = await startAttempt("L01");
    await expect(finishAttempt(a.attemptId)).rejects.toThrow();
    await expect(answerQuestion(a.attemptId, "L01-Q3", "m")).rejects.toThrow();
  });
  it("80% 通过，重复结算仅记录一次，重开 DB 后仍在", async () => {
    const a = await complete("L01", 8);
    await Promise.all([finishAttempt(a.attemptId), finishAttempt(a.attemptId)]);
    (await database()).close();
    const state = await snapshot();
    expect(state.progress[0]).toMatchObject({
      bestScore: 80,
      passed: true,
      attempts: 1,
    });
    expect(state.attempts[0].answers).toHaveLength(10);
  });
  it("70% 不通过，重新学习可提高最好成绩，低分重学保留历史通过", async () => {
    await complete("L04", 7);
    expect((await snapshot()).progress[0]).toMatchObject({
      bestScore: 70,
      passed: false,
      attempts: 1,
    });
    await complete("L04", 10);
    await complete("L04", 2);
    expect((await snapshot()).progress[0]).toMatchObject({
      bestScore: 100,
      passed: true,
      attempts: 3,
    });
    expect((await snapshot()).seen).toHaveLength(7);
  });
  it("未开放课程不能创建学习记录", async () => {
    await expect(startAttempt("L02")).rejects.toThrow();
    expect((await snapshot()).attempts).toHaveLength(0);
  });
});

it("不支持 randomUUID 的本地手机环境仍可生成不重复的尝试 ID", async () => {
  const random = crypto.getRandomValues.bind(crypto);
  vi.stubGlobal("crypto", { getRandomValues: random });
  try {
    const first = await startAttempt("L01");
    const second = await startAttempt("L04");
    expect(first.attemptId).toMatch(/^[0-9a-f]{32}$/);
    expect(first.attemptId).not.toBe(second.attemptId);
  } finally {
    vi.unstubAllGlobals();
  }
});
