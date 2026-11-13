import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HashRouter } from "react-router-dom";
import { StateProvider } from "../app/state";
import { App } from "../app/App";
import {
  saveSettings,
  startAttempt,
  advanceCard,
  snapshot,
} from "../lib/storage/repository";

function mountHash() {
  return render(
    <HashRouter>
      <StateProvider>
        <App />
      </StateProvider>
    </HashRouter>,
  );
}

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("GitHub Pages 子目录和 hash 路由", () => {
  for (const [id, title] of [
    ["L01", "英文字母与字母名称"],
    ["L04", "I am... 自我介绍"],
  ]) {
    it(`${id} hash 深链接直接打开、重新挂载都可访问，保留已存位置`, async () => {
      const attempt = await startAttempt(id);
      await advanceCard(attempt.attemptId);
      await saveSettings({
        dailyTargetMinutes: 20,
        speechRate: 0.65,
        updatedAt: "",
      });
      window.history.replaceState(null, "", `/english-atlas/#/lesson/${id}`);
      const view = mountHash();
      expect(
        await screen.findByRole("heading", { name: title }),
      ).toBeInTheDocument();
      expect(
        await screen.findByRole("button", { name: "恢复本次学习 →" }),
      ).toBeInTheDocument();
      view.unmount();
      mountHash();
      expect(
        await screen.findByRole("button", { name: "恢复本次学习 →" }),
      ).toBeInTheDocument();
      expect((await snapshot()).settings.dailyTargetMinutes).toBe(20);
      expect((await snapshot()).attempts[0].cardIndex).toBe(1);
    });
  }
  it("导航保持 /english-atlas/ 前缀，跳到主要内容不破坏当前课程地址", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/english-atlas/#/learn");
    mountHash();
    await screen.findByRole("heading", { name: "你的第一段英语旅程" });
    const lesson = screen.getByRole("link", { name: /I am.*自我介绍/ });
    expect(lesson).toHaveAttribute("href", "#/lesson/L04");
    await user.click(lesson);
    await screen.findByRole("heading", { name: "I am... 自我介绍" });
    expect(window.location.pathname).toBe("/english-atlas/");
    expect(window.location.hash).toBe("#/lesson/L04");
    await user.click(screen.getByRole("link", { name: "跳到主要内容" }));
    expect(window.location.hash).toBe("#/lesson/L04");
    expect(screen.getByRole("main")).toHaveFocus();
  });
});
