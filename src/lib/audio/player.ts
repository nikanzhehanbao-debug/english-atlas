import manifest from "../../content/audio-manifest.json";
export type PlaybackStatus =
  "idle" | "loading" | "waiting" | "ready" | "playing" | "ended" | "error";
export interface PlaybackState {
  owner: string;
  status: PlaybackStatus;
  source: "file" | "tts" | null;
  message: string;
}
const entries: Record<
  string,
  { file: string; spokenText: string; review: string }
> = manifest;
export function audioFor(text: string) {
  return entries[text.trim().replace(/[‘’]/g, "'")] ?? null;
}
export class SpeechPlayer {
  private listeners = new Set<() => void>();
  private cleanup: (() => void) | undefined;
  private version = 0;
  private state: PlaybackState = {
    owner: "",
    status: "idle",
    source: null,
    message: "",
  };
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  };
  getSnapshot = () => this.state;
  private update(next: Partial<PlaybackState>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((listener) => listener());
  }
  stop(owner?: string) {
    if (owner && this.state.owner !== owner) return;
    this.version++;
    this.cleanup?.();
    this.cleanup = undefined;
    this.update({ status: "idle", message: "播放已停止。" });
  }
  play(owner: string, text: string, rate: number, forceTts = false) {
    this.stop();
    const version = ++this.version;
    const current = () => this.version === version;
    const entry = audioFor(text);
    this.update({
      owner,
      status: "loading",
      source: entry && !forceTts ? "file" : "tts",
      message: "正在准备播放，尚未开始。",
    });
    const fail = (message: string) => {
      if (!current()) return;
      this.cleanup?.();
      this.cleanup = undefined;
      this.update({ status: "error", message });
    };
    if (entry && !forceTts) {
      const audio = new Audio(`${import.meta.env.BASE_URL}audio/${entry.file}`);
      audio.preload = "none";
      audio.playbackRate = rate;
      let started = false;
      const timeout = setTimeout(
        () =>
          fail(
            "音频未开始播放。请检查网络、设备音量后重试，或点“改用设备朗读”。",
          ),
        8000,
      );
      this.cleanup = () => {
        clearTimeout(timeout);
        audio.onplaying = null;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
      };
      audio.onplaying = () => {
        if (!current()) return;
        started = true;
        clearTimeout(timeout);
        this.update({
          status: "playing",
          message: "静态音频正在播放 · 合成示范，发音待实听复核。",
        });
      };
      audio.onended = () => {
        if (!current()) return;
        if (!started) {
          fail("未收到音频开始事件，请重新点按播放。");
          return;
        }
        this.cleanup?.();
        this.cleanup = undefined;
        this.update({
          status: "ended",
          message: "播放已结束。可自行跟读；没有进行口语评分。",
        });
      };
      audio.onerror = () =>
        fail("静态音频加载或解码失败。请重试，或点“改用设备朗读”。");
      try {
        void audio
          .play()
          .catch(() =>
            fail(
              "浏览器未允许播放或音频加载失败。请再次点按，或点“改用设备朗读”。",
            ),
          );
      } catch {
        fail("音频播放不可用，请改用设备朗读。");
      }
      return;
    }
    const synth =
      typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth || typeof window.SpeechSynthesisUtterance !== "function") {
      fail("此浏览器不支持英语朗读。请参考文字学习，或换用支持语音的浏览器。");
      return;
    }
    const english = () =>
      synth.getVoices().filter((v) => /^en(?:[-_]|$)/i.test(v.lang));
    let voices: SpeechSynthesisVoice[];
    try {
      voices = english();
    } catch {
      fail("无法读取设备语音列表，请检查系统文字转语音设置。");
      return;
    }
    if (!voices.length) {
      this.update({
        status: "waiting",
        message: "正在等待设备加载英语语音，最多 3 秒…",
      });
      const changed = () => {
        if (!current()) return;
        try {
          if (english().length) {
            this.cleanup?.();
            this.cleanup = undefined;
            this.update({
              status: "ready",
              message: "英语语音已准备好，请再次点击朗读。",
            });
          }
        } catch {
          fail("读取英语语音失败，请检查系统文字转语音设置。");
        }
      };
      const timer = setTimeout(
        () =>
          fail(
            "未找到英语语音。安卓：设置 → 无障碍（或系统 → 语言）→ 文字转语音输出，安装英语语音数据；返回后重新点按。不同设备菜单名称可能不同。",
          ),
        3000,
      );
      synth.addEventListener("voiceschanged", changed);
      this.cleanup = () => {
        clearTimeout(timer);
        synth.removeEventListener("voiceschanged", changed);
      };
      changed();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.voice = voices.find((v) => v.lang === "en-US") ?? voices[0];
    utterance.rate = rate;
    let started = false;
    const timeout = setTimeout(
      () =>
        fail(
          "已请求设备朗读，但未收到开始事件。请检查音量与文字转语音服务后再点按。",
        ),
      8000,
    );
    this.cleanup = () => {
      clearTimeout(timeout);
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
      synth.cancel();
    };
    utterance.onstart = () => {
      if (!current()) return;
      started = true;
      clearTimeout(timeout);
      this.update({
        status: "playing",
        message: "设备英语语音正在播放；没有进行口语评分。",
      });
    };
    utterance.onend = () => {
      if (!current()) return;
      if (!started) {
        fail("设备没有报告实际开始播放，请检查语音服务后重试。");
        return;
      }
      this.cleanup?.();
      this.cleanup = undefined;
      this.update({
        status: "ended",
        message: "播放已结束。可自行跟读；没有进行口语评分。",
      });
    };
    utterance.onerror = () =>
      fail("设备朗读失败。请检查英语语音数据、设备音量与网络后重试。");
    try {
      synth.speak(utterance);
    } catch {
      fail("设备朗读调用失败，请检查系统文字转语音设置。");
    }
  }
}
export const speechPlayer = new SpeechPlayer();
