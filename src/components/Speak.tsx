import { useEffect, useState } from "react";
import { useAtlas } from "../app/state";
export function Speak({ text, label }: { text: string; label?: string }) {
  const { data } = useAtlas();
  const [message, setMessage] = useState("");
  useEffect(
    () => () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );
  function play() {
    if (
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {
      setMessage(
        "此浏览器不支持英语朗读。请参考文字学习，或换用支持语音的浏览器。",
      );
      return;
    }
    const synth = window.speechSynthesis;
    const voices = synth.getVoices().filter((v) => /^en[-_]/i.test(v.lang));
    if (!voices.length) {
      setMessage(
        "未检测到英语语音包。请在设备的文字转语音设置中安装英语语音后重试；当前不播放，以免语言错误。",
      );
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.voice = voices.find((v) => v.lang === "en-US") ?? voices[0];
    utterance.rate = data?.settings.speechRate ?? 0.85;
    utterance.onerror = () =>
      setMessage(
        "朗读失败，请检查设备语音服务或网络。你仍可使用文字完成课程。",
      );
    utterance.onend = () =>
      setMessage("播放已结束，可自行跟读；未进行口语评分。");
    setMessage("已请求英语朗读；若无声音，请检查设备音量与语音服务。");
    synth.speak(utterance);
  }
  return (
    <span className="speak">
      <button
        type="button"
        className="sound"
        aria-label={label ?? `朗读 ${text}`}
        onClick={play}
      >
        ♪ <span>{label ?? "朗读"}</span>
      </button>
      {message && (
        <span className="speech-message" role="status">
          {message}
        </span>
      )}
    </span>
  );
}
