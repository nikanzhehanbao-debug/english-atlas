import { describe, it, expect, vi } from "vitest";
import { openDB, deleteDB } from "idb";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  database,
  snapshot,
  startAttempt,
  answerQuestion,
  finishAttempt,
} from "../lib/storage/repository";
import {
  startChallenge,
  answerChallenge,
  finishChallenge,
  challengeSummary,
} from "../lib/storage/challengeRepository";
import { challenges } from "../content/challenges";
import { lessons } from "../content/lessons";
import { ChallengePage } from "../pages/Challenge";
import { StateProvider, useAtlas } from "../app/state";
import { grade } from "../features/lesson/grading";
const date = "2026-11-13T00:00:00.000Z";
function Ready() {
  const { data } = useAtlas();
  return data ? (
    <Routes>
      <Route path="/lesson/:id/challenge" element={<ChallengePage />} />
    </Routes>
  ) : (
    <p>加载中</p>
  );
}
function mount(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/lesson/${id}/challenge`]}>
      <StateProvider>
        <Ready />
      </StateProvider>
    </MemoryRouter>,
  );
}
describe("可选挑战内容和旧数据兼容", () => {
  it("每课六道封闭题与一项自主表达，标准答案与干扰选项审查，旧基础题保持10道", () => {
    for (const id of ["L01", "L04"]) {
      const questions = challenges[id].questions;
      expect(questions).toHaveLength(7);
      expect(new Set(questions.map((q) => q.questionId)).size).toBe(7);
      expect(questions.filter((q) => q.type === "output")).toHaveLength(1);
      expect(lessons[id].questions).toHaveLength(10);
      for (const q of questions) {
        if (q.type === "output") continue;
        for (const answer of q.answers)
          expect(grade(q, answer), q.questionId).toBe(true);
        if (q.type === "choice")
          for (const option of q.options!)
            expect(grade(q, option)).toBe(q.answers.includes(option));
      }
    }
  });
  it("v1真实数据库升级到v2只新增挑战表，四类旧记录逐字保留并可续答旧课", async () => {
    const name = "english-atlas-migration-fixture";
    const old = await openDB(name, 1, {
      upgrade(db) {
        db.createObjectStore("settings");
        db.createObjectStore("lessonProgress", { keyPath: "lessonId" });
        db.createObjectStore("exerciseAttempts", { keyPath: "attemptId" });
        db.createObjectStore("seenItems", { keyPath: "itemId" });
      },
    });
    const settings = {
      dailyTargetMinutes: 20,
      speechRate: 0.65,
      updatedAt: date,
    };
    const progress = {
      lessonId: "L01",
      passed: true,
      bestScore: 80,
      attempts: 1,
      updatedAt: date,
      completedAt: date,
    };
    const attempt = {
      attemptId: "old-active",
      lessonId: "L01",
      cardIndex: 2,
      stage: "practice" as const,
      answers: [
        { questionId: "L01-Q1", answer: "26", correct: true, answeredAt: date },
      ],
      startedAt: date,
      updatedAt: date,
    };
    const seen = { itemId: "L01-A", seenAt: date };
    await old.put("settings", settings, "preferences");
    await old.put("lessonProgress", progress);
    await old.put("exerciseAttempts", attempt);
    await old.put("seenItems", seen);
    old.close();
    const upgraded = await database(name);
    expect(upgraded.version).toBe(2);
    expect(await upgraded.get("settings", "preferences")).toEqual(settings);
    expect(await upgraded.get("lessonProgress", "L01")).toEqual(progress);
    expect(await upgraded.get("exerciseAttempts", "old-active")).toEqual(
      attempt,
    );
    expect(await upgraded.get("seenItems", "L01-A")).toEqual(seen);
    expect(await upgraded.getAll("challengeAttempts")).toEqual([]);
    upgraded.close();
    await deleteDB(name);
    const db = await database();
    await db.put("settings", settings, "preferences");
    await db.put("lessonProgress", progress);
    await db.put("exerciseAttempts", attempt);
    await db.put("seenItems", seen);
    expect(await startAttempt("L01")).toEqual(attempt);
    for (const q of lessons.L01.questions.slice(1))
      await answerQuestion(attempt.attemptId, q.questionId, q.answers[0]);
    await finishAttempt(attempt.attemptId);
    const state = await snapshot();
    expect(state.progress[0]).toMatchObject({
      bestScore: 100,
      attempts: 2,
      passed: true,
    });
    expect(state.settings).toEqual(settings);
    expect(state.seen).toEqual([seen]);
  });
  it("旧标签页阻止升级时明确报错，关闭后可重试且不删库", async () => {
    const name = "english-atlas-blocked-fixture";
    const old = await openDB(name, 1, {
      upgrade(db) {
        db.createObjectStore("settings");
        db.createObjectStore("lessonProgress", { keyPath: "lessonId" });
        db.createObjectStore("exerciseAttempts", { keyPath: "attemptId" });
        db.createObjectStore("seenItems", { keyPath: "itemId" });
      },
    });
    await old.put(
      "settings",
      { dailyTargetMinutes: 30, speechRate: 1, updatedAt: date },
      "preferences",
    );
    await expect(database(name)).rejects.toThrow("关闭其他英语图鉴页面");
    old.close();
    const upgraded = await database(name);
    expect(
      (await upgraded.get("settings", "preferences"))?.dailyTargetMinutes,
    ).toBe(30);
    upgraded.close();
    await deleteDB(name);
  });
  it("并发挑战/重复答案与结算幂等，开放表达不计正确率，不覆盖基础统计", async () => {
    const db = await database();
    const progress = {
      lessonId: "L04",
      passed: true,
      bestScore: 90,
      attempts: 2,
      updatedAt: date,
      completedAt: date,
    };
    await db.put("lessonProgress", progress);
    const [a, b] = await Promise.all([
      startChallenge("L04"),
      startChallenge("L04"),
    ]);
    expect(a.attemptId).toBe(b.attemptId);
    for (const q of challenges.L04.questions) {
      const answer =
        q.type === "output" ? "I'm Alex. I'm happy." : q.answers[0];
      await Promise.all([
        answerChallenge(
          a.attemptId,
          q.questionId,
          answer,
          q.type === "output" ? "practice" : undefined,
        ),
        answerChallenge(
          a.attemptId,
          q.questionId,
          answer,
          q.type === "output" ? "practice" : undefined,
        ),
      ]);
    }
    const [done, again] = await Promise.all([
      finishChallenge(a.attemptId),
      finishChallenge(a.attemptId),
    ]);
    expect(done).toEqual(again);
    expect(done.answers).toHaveLength(7);
    expect(challengeSummary(done)).toMatchObject({
      correct: 6,
      total: 6,
      output: { correct: null, selfRating: "practice" },
    });
    expect((await snapshot()).progress).toEqual([progress]);
    expect((await snapshot()).attempts).toEqual([]);
    expect((await snapshot()).seen).toEqual([]);
    expect((await snapshot()).challenges).toHaveLength(1);
  });
  it("挑战未答完不能结算，乱序与空答案被拒，未开放课不可开始", async () => {
    const a = await startChallenge("L01");
    await expect(finishChallenge(a.attemptId)).rejects.toThrow("完成挑战");
    await expect(
      answerChallenge(a.attemptId, "L01-CH1-Q2", "l"),
    ).rejects.toThrow("顺序");
    await expect(
      answerChallenge(a.attemptId, "L01-CH1-Q1", ""),
    ).rejects.toThrow();
    await expect(startChallenge("L02")).rejects.toThrow();
  });
  it("自主表达必须显式自评，不用参考句当唯一答案，英文缩写接受弯引号", async () => {
    const a = await startChallenge("L04");
    for (const q of challenges.L04.questions.slice(0, 6))
      if (q.type !== "output")
        await answerChallenge(a.attemptId, q.questionId, q.answers[0]);
    await expect(
      answerChallenge(a.attemptId, "L04-CH1-Q7", "My chosen introduction."),
    ).rejects.toThrow("选择自评");
    const saved = await answerChallenge(
      a.attemptId,
      "L04-CH1-Q7",
      "My chosen introduction.",
      "practice",
    );
    expect(saved.answers.at(-1)?.correct).toBeNull();
    const q = challenges.L04.questions[0];
    if (q.type !== "output") {
      expect(grade(q, "I’m tired.")).toBe(true);
      expect(grade(q, "I is tired.")).toBe(false);
    }
  });
});
describe("挑战真实界面流程", () => {
  for (const id of ["L01", "L04"])
    it(`${id} 从封闭题到自主表达与自评，刷新恢复和完成独立保存`, async () => {
      const user = userEvent.setup();
      let view = mount(id);
      await user.click(
        await screen.findByRole("button", { name: "开始可选挑战 →" }),
      );
      for (const [i, q] of challenges[id].questions.entries()) {
        if (q.type === "choice")
          await user.click(await screen.findByLabelText(q.answers[0]));
        else if (q.type === "output") {
          await user.type(
            await screen.findByLabelText("你的自主表达"),
            "My own introduction.",
          );
          expect(
            screen.getByRole("button", { name: "保存表达与自评" }),
          ).toBeDisabled();
          await user.click(screen.getByLabelText("还需练习"));
        } else
          await user.type(
            await screen.findByLabelText("你的挑战答案"),
            q.answers[0],
          );
        await user.dblClick(
          screen.getByRole("button", {
            name: q.type === "output" ? "保存表达与自评" : "检查挑战答案",
          }),
        );
        await screen.findByText(
          q.type === "output" ? "输出已保存（未自动评分）" : "✓ 回答正确",
        );
        if (i === 0) {
          view.unmount();
          view = mount(id);
          await user.click(
            await screen.findByRole("button", { name: "恢复挑战 →" }),
          );
          await screen.findByText("✓ 回答正确");
        }
        await user.click(
          await screen.findByRole("button", {
            name: i === 6 ? "完成挑战 →" : "下一项 →",
          }),
        );
      }
      expect(
        await screen.findByRole("heading", { name: "本次挑战已记录" }),
      ).toBeInTheDocument();
      expect(screen.getByText("封闭练习：答对 6 / 6 题")).toBeInTheDocument();
      expect((await snapshot()).progress).toHaveLength(0);
      view.unmount();
      mount(id);
      await user.click(
        await screen.findByRole("button", { name: "查看上次挑战" }),
      );
      expect(
        await screen.findByRole("heading", { name: "本次挑战已记录" }),
      ).toBeInTheDocument();
    }, 15000);
  it("无声时可展开文本自检，不产生判分记录或基础成绩", async () => {
    const user = userEvent.setup();
    mount("L04");
    await user.click(await screen.findByText("显示示范文本与跟读提示"));
    expect(screen.getByText("I am a student.")).toBeInTheDocument();
    expect((await snapshot()).challenges).toHaveLength(0);
    expect((await snapshot()).progress).toHaveLength(0);
  });
  it("挑战保存失败时保留答案，可以重试且不重复记录", async () => {
    const repository = await import("../lib/storage/challengeRepository");
    const user = userEvent.setup();
    mount("L01");
    await user.click(
      await screen.findByRole("button", { name: "开始可选挑战 →" }),
    );
    await user.type(await screen.findByLabelText("你的挑战答案"), "B D P Q");
    vi.spyOn(repository, "answerChallenge").mockRejectedValueOnce(
      new Error("存储空间不足"),
    );
    await user.click(screen.getByRole("button", { name: "检查挑战答案" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("存储空间不足");
    expect(screen.getByLabelText("你的挑战答案")).toHaveValue("B D P Q");
    await user.click(screen.getByRole("button", { name: "检查挑战答案" }));
    expect(await screen.findByText("✓ 回答正确")).toBeInTheDocument();
    expect((await snapshot()).challenges[0].answers).toHaveLength(1);
  });
});
