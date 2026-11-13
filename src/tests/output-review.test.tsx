import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { StateProvider, useAtlas } from "../app/state";
import { ChallengePage } from "../pages/Challenge";
import { challenges } from "../content/challenges";
import { database, snapshot, schemaVersion } from "../lib/storage/repository";
import * as repository from "../lib/storage/challengeRepository";
import type { ChallengeAttempt } from "../features/challenge/model";
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
async function prepare(id: string) {
  const attempt = await repository.startChallenge(id);
  for (const q of challenges[id].questions.slice(0, 6))
    if (q.type !== "output")
      await repository.answerChallenge(
        attempt.attemptId,
        q.questionId,
        q.answers[0],
      );
  return attempt;
}
describe("独立表达先提交，参考与复评后展示", () => {
  for (const id of ["L01", "L04"])
    it(`${id}默认/保存中/失败不泄露范文，成功后可复评并恢复`, async () => {
      const attempt = await prepare(id);
      const q = challenges[id].questions[6];
      if (q.type !== "output") throw Error("fixture");
      const user = userEvent.setup();
      let view = mount(id);
      await user.click(
        await screen.findByRole("button", { name: "恢复挑战 →" }),
      );
      await user.click(await screen.findByRole("button", { name: "下一项 →" }));
      const input = await screen.findByLabelText("你的自主表达");
      const expectNoReference = () => {
        expect(screen.queryByText(q.reference)).not.toBeInTheDocument();
        for (const point of q.checkpoints)
          expect(screen.queryByText(point)).not.toBeInTheDocument();
        expect(
          screen.queryByRole("region", { name: "提交后参考与自评" }),
        ).not.toBeInTheDocument();
      };
      expectNoReference();
      if (id === "L01")
        expect(
          screen.queryByText(/Mia \/ M I A \/ m i a/),
        ).not.toBeInTheDocument();
      await user.type(input, "My independent first draft.");
      await user.click(screen.getByLabelText("能独立完成", { exact: true }));
      expectNoReference();
      let rejectSave!: (reason: Error) => void;
      vi.spyOn(repository, "answerChallenge").mockImplementationOnce(
        () =>
          new Promise<ChallengeAttempt>((_, reject) => {
            rejectSave = reject;
          }),
      );
      await user.click(screen.getByRole("button", { name: "保存表达与自评" }));
      expectNoReference();
      expect(input).toBeDisabled();
      expect((await snapshot()).challenges[0].answers).toHaveLength(6);
      rejectSave(new Error("本机写入失败"));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "本机写入失败",
      );
      expectNoReference();
      expect(input).toHaveValue("My independent first draft.");
      expect(
        screen.getByLabelText("能独立完成", { exact: true }),
      ).toBeChecked();
      await user.click(screen.getByRole("button", { name: "保存表达与自评" }));
      expect(await screen.findByText(q.reference)).toBeVisible();
      for (const point of q.checkpoints)
        expect(screen.getByText(point)).toBeVisible();
      let saved = (await snapshot()).challenges[0].answers[6];
      expect(saved).toMatchObject({
        answer: "My independent first draft.",
        correct: null,
        initialSelfRating: "independent",
        selfRating: "independent",
        outputMode: "independent-first",
      });
      const answeredAt = saved.answeredAt;
      await user.click(screen.getByLabelText("参考后还需练习"));
      await user.click(screen.getByRole("button", { name: "保存参考后自评" }));
      await screen.findByText(/当前已保存自评：还需练习 · 参考后自评已保存/);
      saved = (await snapshot()).challenges[0].answers[6];
      expect(saved).toMatchObject({
        answer: "My independent first draft.",
        correct: null,
        initialSelfRating: "independent",
        selfRating: "practice",
        answeredAt,
      });
      expect(saved.selfRatingUpdatedAt).toBeTruthy();
      view.unmount();
      view = mount(id);
      await user.click(
        await screen.findByRole("button", { name: "恢复挑战 →" }),
      );
      expect(await screen.findByText(q.reference)).toBeVisible();
      expect(
        screen.getByText("提交前初步自评：能独立完成（已保留）"),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("参考后还需练习")).toBeChecked();
      await user.click(screen.getByRole("button", { name: "完成挑战 →" }));
      await screen.findByRole("heading", { name: "本次挑战已记录" });
      view.unmount();
      mount(id);
      await user.click(
        await screen.findByRole("button", { name: "查看上次挑战" }),
      );
      await user.click(screen.getByText("回看本次答案与解释"));
      expect(await screen.findByText(q.reference)).toBeVisible();
      expect(screen.getByLabelText("参考后还需练习")).toBeChecked();
      expect((await snapshot()).progress).toEqual([]);
      expect((await snapshot()).attempts).toEqual([]);
      expect((await snapshot()).seen).toEqual([]);
      expect(attempt.attemptId).toBe(
        (await snapshot()).challenges[0].attemptId,
      );
    }, 15000);
  it("历史已完成记录可复评，不杜撰独立作答证据，不改原答案/时间/完成状态和旧四表", async () => {
    const a = await prepare("L04");
    await repository.answerChallenge(
      a.attemptId,
      "L04-CH1-Q7",
      "I'm a student.",
      "independent",
    );
    const finished = await repository.finishChallenge(a.attemptId);
    const db = await database();
    delete finished.answers[6].initialSelfRating;
    delete finished.answers[6].outputMode;
    await db.put("challengeAttempts", finished);
    await db.put(
      "settings",
      {
        dailyTargetMinutes: 20,
        speechRate: 0.65,
        updatedAt: "2026-11-13T00:00:00.000Z",
      },
      "preferences",
    );
    await db.put("lessonProgress", {
      lessonId: "L04",
      passed: true,
      bestScore: 80,
      attempts: 2,
      updatedAt: "2026-11-13T00:00:00.000Z",
      completedAt: "2026-11-13T00:00:00.000Z",
    });
    await db.put("exerciseAttempts", {
      attemptId: "old-basic-active",
      lessonId: "L01",
      cardIndex: 1,
      stage: "teaching",
      answers: [],
      startedAt: "2026-11-13T00:00:00.000Z",
      updatedAt: "2026-11-13T00:00:00.000Z",
    });
    await db.put("seenItems", {
      itemId: "L01-A",
      seenAt: "2026-11-13T00:00:00.000Z",
    });
    const before = await snapshot();
    const user = userEvent.setup();
    mount("L04");
    await user.click(
      await screen.findByRole("button", { name: "查看上次挑战" }),
    );
    await user.click(screen.getByText("回看本次答案与解释"));
    expect(
      screen.getByText(
        "历史自评：旧版可能已提前展示参考，不作为独立输出证据。",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/提交前初步自评：/)).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("参考后还需练习"));
    await user.click(screen.getByRole("button", { name: "保存参考后自评" }));
    await screen.findByText(/当前已保存自评：还需练习 · 参考后自评已保存/);
    const after = await snapshot();
    const revised = after.challenges[0];
    expect(schemaVersion).toBe(2);
    expect(revised.finishedAt).toBe(finished.finishedAt);
    expect(revised.startedAt).toBe(finished.startedAt);
    expect(revised.answers.slice(0, 6)).toEqual(finished.answers.slice(0, 6));
    expect(revised.answers[6]).toMatchObject({
      answer: finished.answers[6].answer,
      answeredAt: finished.answers[6].answeredAt,
      correct: null,
      selfRating: "practice",
    });
    expect(revised.answers[6].initialSelfRating).toBeUndefined();
    expect(revised.answers[6].outputMode).toBeUndefined();
    for (const key of ["settings", "progress", "attempts", "seen"] as const)
      expect(after[key]).toEqual(before[key]);
    expect(repository.challengeSummary(revised)).toMatchObject({
      correct: 6,
      total: 6,
    });
  });
  it("复评事务防重复且只允许已保存开放题，不改变封闭成绩或初步自评", async () => {
    const a = await prepare("L01");
    await expect(
      repository.reviseChallengeSelfRating(
        a.attemptId,
        "L01-CH1-Q7",
        "practice",
      ),
    ).rejects.toThrow("已保存自主表达");
    await expect(
      repository.reviseChallengeSelfRating(
        a.attemptId,
        "L01-CH1-Q1",
        "practice",
      ),
    ).rejects.toThrow();
    await expect(
      repository.reviseChallengeSelfRating(
        a.attemptId,
        "L01-CH1-Q7",
        undefined,
      ),
    ).rejects.toThrow("有效");
    await repository.answerChallenge(
      a.attemptId,
      "L01-CH1-Q7",
      "Pat / P A T / p a t",
      "independent",
    );
    const [first, second] = await Promise.all([
      repository.reviseChallengeSelfRating(
        a.attemptId,
        "L01-CH1-Q7",
        "practice",
      ),
      repository.reviseChallengeSelfRating(
        a.attemptId,
        "L01-CH1-Q7",
        "practice",
      ),
    ]);
    expect(first).toEqual(second);
    expect(first.answers).toHaveLength(7);
    expect(first.answers[6].initialSelfRating).toBe("independent");
    expect(repository.challengeSummary(first)).toMatchObject({
      correct: 6,
      total: 6,
    });
  });
  it("复评保存失败保留当前选择，持久记录不假更新，重试不会覆盖初稿", async () => {
    const a = await prepare("L04");
    await repository.answerChallenge(
      a.attemptId,
      "L04-CH1-Q7",
      "Independent draft.",
      "independent",
    );
    const user = userEvent.setup();
    mount("L04");
    await user.click(await screen.findByRole("button", { name: "恢复挑战 →" }));
    await user.click(await screen.findByLabelText("参考后还需练习"));
    vi.spyOn(repository, "reviseChallengeSelfRating").mockRejectedValueOnce(
      new Error("复评写入失败"),
    );
    await user.click(screen.getByRole("button", { name: "保存参考后自评" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("复评写入失败");
    expect(screen.getByLabelText("参考后还需练习")).toBeChecked();
    expect((await snapshot()).challenges[0].answers[6].selfRating).toBe(
      "independent",
    );
    await user.click(screen.getByRole("button", { name: "保存参考后自评" }));
    await screen.findByText(/当前已保存自评：还需练习 · 参考后自评已保存/);
    expect((await snapshot()).challenges[0].answers[6].answer).toBe(
      "Independent draft.",
    );
  });
});
