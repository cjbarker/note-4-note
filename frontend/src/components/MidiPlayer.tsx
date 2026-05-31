// In-browser audio playback of the transcribed MIDI, so the user can *listen*
// to the result and judge the transcription quality by ear.
//
// Built on the html-midi-player web component (importing it registers the
// <midi-player> / <midi-visualizer> custom elements). It plays the same base64
// MIDI the backend already returns, with a sampled acoustic-piano SoundFont
// (sound-font="" → the library's default sgm_plus, loaded lazily on first Play),
// plus a piano-roll that shows what's playing.
//
// It also forwards the element's playback events (start / per-note / stop) up to
// the parent so the engraved score can follow along with a cursor.
import { useEffect, useRef } from "react";
import "html-midi-player";

interface Props {
  midiBase64: string;
  onPlaybackStart?: () => void;
  onPlaybackNote?: (startSeconds: number) => void;
  onPlaybackStop?: () => void;
}

const VISUALIZER_ID = "nfn-midi-visualizer";

export default function MidiPlayer({
  midiBase64,
  onPlaybackStart,
  onPlaybackNote,
  onPlaybackStop,
}: Props) {
  const playerRef = useRef<HTMLElement>(null);
  const src = `data:audio/midi;base64,${midiBase64}`;

  // Keep the latest callbacks in a ref so the listener effect can stay mounted
  // once without re-attaching when the parent re-renders.
  const handlers = useRef({ onPlaybackStart, onPlaybackNote, onPlaybackStop });
  handlers.current = { onPlaybackStart, onPlaybackNote, onPlaybackStop };

  // Bind the visualizer to the player after both have mounted. Setting the
  // `visualizer` attribute here (rather than in JSX) avoids a render-order race
  // where the player could evaluate the selector before the visualizer exists.
  useEffect(() => {
    playerRef.current?.setAttribute("visualizer", `#${VISUALIZER_ID}`);
  }, []);

  // Forward playback events for the score-follow cursor.
  useEffect(() => {
    const el = playerRef.current;
    if (!el) return;
    const onStart = () => handlers.current.onPlaybackStart?.();
    const onStop = () => handlers.current.onPlaybackStop?.();
    const onNote = (e: Event) => {
      const startTime = (e as CustomEvent).detail?.note?.startTime;
      if (typeof startTime === "number") handlers.current.onPlaybackNote?.(startTime);
    };
    el.addEventListener("start", onStart);
    el.addEventListener("stop", onStop);
    el.addEventListener("note", onNote);
    return () => {
      el.removeEventListener("start", onStart);
      el.removeEventListener("stop", onStop);
      el.removeEventListener("note", onNote);
    };
  }, []);

  return (
    <div className="midi-player" role="group" aria-label="Transcription playback">
      <midi-player ref={playerRef} src={src} sound-font="" aria-label="Play transcription" />
      <midi-visualizer id={VISUALIZER_ID} type="piano-roll" src={src} />
    </div>
  );
}
