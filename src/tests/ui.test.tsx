import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { StateProvider, useAtlas } from "../app/state";
import { LessonPage } from "../pages/Lesson";
import { Home, Learn, Review, Atlas, Settings } from "../pages/Pages";
import { Speak } from "../components/Speak";
import * as repository from "../lib/storage/repository";
import { lessons } from "../content/lessons";
function Ready({ children }: { children: React.ReactNode }) {
  const { data } = useAtlas();
  return data ? <>{children}</> : <p>加载中</p>;
}
function mount(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <StateProvider>
        <Ready>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/lesson/:id" element={<LessonPage />} />
            <Route path="/review" element={<Review />} />
            <Route path="/atlas" element={<Atlas />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Ready>
      </StateProvider>
    </MemoryRouter>,
  );
}
describe("页面与真实学习流程", () => {
  for (const [path, title] of [
    ["/", "每一步，都算数。"],
    ["/learn", "你的第一段英语旅程"],
    ["/review", "给记忆一点生长的时间"],
    ["/atlas", "把遇见的英语，记下来。"],
    ["/settings", "找到适合自己的节奏"],
    ["/lesson/L02", "这片小岛还没有开放"],
  ])
    it(`${path} 可打开且没有假数据`, async () => {
      mount(path);
      expect(
        await screen.findByRole("heading", { name: title }),
      ).toBeInTheDocument();
    });
  for (const id of ["L01", "L04"])
    it(`${id} 从教学到混合练习到结算，刷新恢复反馈，重复提交防重`, async () => {
      const user = userEvent.setup();
      let view = mount(`/lesson/${id}`);
      await user.click(
        await screen.findByRole("button", { name: "开始本次学习 →" }),
      );
      for (let i = 0; i < 3; i++)
        await user.click(await screen.findByRole("button", { name: /已阅读/ }));
      for (const [index, q] of lessons[id].questions.entries()) {
        if (q.type === "choice")
          await user.click(await screen.findByLabelText(q.answers[0]));
        else if (q.type === "input")
          await user.type(
            await screen.findByLabelText("你的答案"),
            q.answers[0],
          );
        else
          for (const word of q.answers[0].split(" "))
            await user.click(await screen.findByRole("button", { name: word }));
        await user.dblClick(screen.getByRole("button", { name: "检查答案" }));
        await screen.findByText("✓ 回答正确");
        if (index === 0) {
          view.unmount();
          view = mount(`/lesson/${id}`);
          await user.click(
            await screen.findByRole("button", { name: "恢复本次学习 →" }),
          );
          await screen.findByText("✓ 回答正确");
        }
        await user.click(
          await screen.findByRole("button", {
            name: index === 9 ? "保存并查看结果 →" : "下一题 →",
          }),
        );
      }
      expect(
        await screen.findByRole("heading", { name: "本次测验通过！" }),
      ).toBeInTheDocument();
      expect(screen.getByText("✓ 成绩已保存到本机")).toBeInTheDocument();
      const state = await repository.snapshot();
      expect(state.progress[0]).toMatchObject({ bestScore: 100, attempts: 1 });
      expect(state.attempts[0].answers).toHaveLength(10);
      view.unmount();
      mount("/");
      expect(await screen.findByText("今天完成 1 次测验")).toBeInTheDocument();
    }, 15_000);
  it("设置成功后可重新读取", async () => {
    const user = userEvent.setup();
    mount("/settings");
    await user.selectOptions(await screen.findByLabelText(/每日目标/), "20");
    await user.selectOptions(screen.getByLabelText(/英文朗读语速/), "0.65");
    await user.click(screen.getByRole("button", { name: "保存设置" }));
    expect(await screen.findByText("设置已保存到本机。")).toBeInTheDocument();
    expect((await repository.snapshot()).settings.dailyTargetMinutes).toBe(20);
  });
  it("保存失败有明确反馈，可重试，不假装开始成功", async () => {
    const user = userEvent.setup();
    vi.spyOn(repository, "startAttempt").mockRejectedValueOnce(
      new Error("quota"),
    );
    mount("/lesson/L01");
    await user.click(
      await screen.findByRole("button", { name: "开始本次学习 →" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("保存失败");
    expect((await repository.snapshot()).attempts).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "开始本次学习 →" }));
    expect(
      await screen.findByRole("heading", { name: "26 个字母，一张新地图" }),
    ).toBeInTheDocument();
  });
  it("TTS 不可用时说明原因", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("speechSynthesis", undefined);
    const previous = Object.getOwnPropertyDescriptor(window, "speechSynthesis");
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
    render(<Speak text="Hello" />);
    await user.click(screen.getByRole("button", { name: "朗读 Hello" }));
    expect(screen.getByRole("status")).toHaveTextContent("不支持英语朗读");
    if (previous) Object.defineProperty(window, "speechSynthesis", previous);
    vi.unstubAllGlobals();
  });
});
