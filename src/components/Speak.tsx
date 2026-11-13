import { useEffect, useId, useSyncExternalStore } from "react";
import { useAtlas } from "../app/state";
import { speechPlayer } from "../lib/audio/player";
export function Speak({ text, label }: { text: string; label?: string }) {
  const { data } = useAtlas();
  const owner = useId();
  const state = useSyncExternalStore(
    speechPlayer.subscribe,
    speechPlayer.getSnapshot,
  );
  const own = state.owner === owner;
  const playing = own && state.status === "playing";
  const pending =
    own && (state.status === "loading" || state.status === "waiting");
  useEffect(() => () => speechPlayer.stop(owner), [owner]);
  const play = (fallback = false) =>
    speechPlayer.play(owner, text, data?.settings.speechRate ?? 0.85, fallback);
  return (
    <span className="speak">
      <button
        type="button"
        className={`sound ${playing ? "is-playing" : ""}`}
        aria-label={label ?? `朗读 ${text}`}
        aria-busy={pending}
        onClick={() => play()}
      >
        ♪ <span>{playing ? "重新播放" : (label ?? "朗读")}</span>
      </button>
      {own && state.message && (
        <span className="speech-message" role="status">
          {state.message}
        </span>
      )}
      {own && (playing || pending) && (
        <button
          type="button"
          className="audio-action"
          onClick={() => speechPlayer.stop(owner)}
        >
          停止朗读
        </button>
      )}
      {own && state.status === "error" && state.source === "file" && (
        <button
          type="button"
          className="audio-action"
          onClick={() => play(true)}
        >
          改用设备朗读
        </button>
      )}
    </span>
  );
}
