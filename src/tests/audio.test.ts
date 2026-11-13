import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { SpeechPlayer, audioFor } from "../lib/audio/player";
import manifest from "../content/audio-manifest.json";
import { alphabet, lessons } from "../content/lessons";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
class Media {
  static instances: Media[] = [];
  static reject = false;
  onplaying: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  preload = "";
  playbackRate = 1;
  play = vi.fn(() =>
    Media.reject ? Promise.reject(new Error("blocked")) : Promise.resolve(),
  );
  pause = vi.fn();
  constructor(public src: string) {
    Media.instances.push(this);
  }
}
class Utterance {
  lang = "";
  voice: unknown;
  rate = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}
const english = { lang: "en-US", name: "English" } as SpeechSynthesisVoice;
function tts(voices: SpeechSynthesisVoice[] = []) {
  const target = new EventTarget();
  const synth = Object.assign(target, {
    getVoices: vi.fn(() => voices),
    speak: vi.fn<(utterance: Utterance) => void>(),
    cancel: vi.fn(),
  });
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
  return synth;
}
beforeEach(() => {
  vi.useFakeTimers();
  Media.instances = [];
  Media.reject = false;
  vi.stubGlobal("Audio", Media);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("静态音频优先与可诊断的设备回退", () => {
  it("26字母、L04核心词和例句都有真实有哈希的MP3文件", () => {
    for (const text of [
      ...alphabet,
      ...lessons.L04.items.flatMap((i) => [i.term, i.example]),
      ...lessons.L04.cards.flatMap((c) => c.examples.map((e) => e.en)),
    ])
      expect(audioFor(text), text).not.toBeNull();
    for (const entry of Object.values(manifest)) {
      const bytes = readFileSync(`public/audio/${entry.file}`);
      expect(bytes.length).toBeGreaterThan(1000);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        entry.sha256,
      );
      expect(entry.review).toBe("pending-listening");
    }
  });
  it("点击立即请求静态播放，promise完成不等于实际开始，只有playing事件确认", async () => {
    const player = new SpeechPlayer();
    tts();
    player.play("a", "A", 0.65);
    const audio = Media.instances[0];
    expect(audio.src).toContain("/english-atlas/audio/letter-a.mp3");
    expect(audio.preload).toBe("none");
    expect(audio.playbackRate).toBe(0.65);
    await Promise.resolve();
    expect(player.getSnapshot().status).toBe("loading");
    audio.onplaying!();
    expect(player.getSnapshot().status).toBe("playing");
    audio.onended!();
    expect(player.getSnapshot().status).toBe("ended");
    player.stop();
  });
  it("静态失败不假装成功，可由下一次用户点击切到TTS", () => {
    const player = new SpeechPlayer();
    const synth = tts([english]);
    player.play("a", "A", 1);
    Media.instances[0].onerror!();
    expect(player.getSnapshot().status).toBe("error");
    expect(synth.speak).not.toHaveBeenCalled();
    player.play("a", "A", 1, true);
    expect(synth.speak).toHaveBeenCalledOnce();
    player.stop();
  });
  it("播放被浏览器拒绝时显示失败", async () => {
    Media.reject = true;
    const player = new SpeechPlayer();
    player.play("a", "A", 1);
    await Promise.resolve();
    expect(player.getSnapshot().message).toContain("浏览器未允许播放");
    player.stop();
  });
  it("重复播放停止旧实例，旧回调不能覆盖新状态，其他按钮卸载不打断播放", () => {
    const player = new SpeechPlayer();
    player.play("a", "A", 1);
    const old = Media.instances[0];
    const oldPlaying = old.onplaying!;
    player.play("b", "B", 1);
    expect(old.pause).toHaveBeenCalled();
    oldPlaying();
    expect(player.getSnapshot()).toMatchObject({
      owner: "b",
      status: "loading",
    });
    player.stop("a");
    expect(player.getSnapshot().status).toBe("loading");
    player.stop("b");
    expect(player.getSnapshot().status).toBe("idle");
  });
  it("等待voiceschanged，延迟加载后提示再次点击以保持用户手势", () => {
    const player = new SpeechPlayer();
    const synth = tts();
    player.play("x", "Unlisted example", 1);
    expect(player.getSnapshot().status).toBe("waiting");
    synth.getVoices.mockReturnValue([english]);
    synth.dispatchEvent(new Event("voiceschanged"));
    expect(player.getSnapshot().status).toBe("ready");
    expect(synth.speak).not.toHaveBeenCalled();
    player.play("x", "Unlisted example", 1);
    expect(synth.speak).toHaveBeenCalledOnce();
    const utterance = synth.speak.mock.calls[0][0] as unknown as Utterance;
    expect(player.getSnapshot().status).toBe("loading");
    utterance.onstart!();
    expect(player.getSnapshot().status).toBe("playing");
    utterance.onend!();
    expect(player.getSnapshot().status).toBe("ended");
    player.stop();
  });
  it("无英语语音超时提供安卓安装指导，迟到事件不改变错误状态", () => {
    const player = new SpeechPlayer();
    const synth = tts();
    player.play("x", "Unlisted example", 1);
    vi.advanceTimersByTime(3000);
    expect(player.getSnapshot()).toMatchObject({ status: "error" });
    expect(player.getSnapshot().message).toContain("文字转语音");
    synth.getVoices.mockReturnValue([english]);
    synth.dispatchEvent(new Event("voiceschanged"));
    expect(player.getSnapshot().status).toBe("error");
    player.stop();
  });
  it("请求TTS但没有onstart不能显示播放成功", () => {
    const player = new SpeechPlayer();
    tts([english]);
    player.play("x", "Unlisted example", 1);
    vi.advanceTimersByTime(8000);
    expect(player.getSnapshot().status).toBe("error");
    expect(player.getSnapshot().message).toContain("未收到开始事件");
    player.stop();
  });
  it("设备TTS失败可重新播放，停止等待会移除监听器", () => {
    const player = new SpeechPlayer();
    const synth = tts([english]);
    player.play("x", "Unlisted example", 1);
    (synth.speak.mock.calls[0][0] as unknown as Utterance).onerror!();
    expect(player.getSnapshot().status).toBe("error");
    synth.getVoices.mockReturnValue([]);
    player.play("x", "Unlisted example", 1);
    player.stop("x");
    synth.getVoices.mockReturnValue([english]);
    synth.dispatchEvent(new Event("voiceschanged"));
    vi.advanceTimersByTime(9000);
    expect(player.getSnapshot().status).toBe("idle");
  });
});
