import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAudioRecorder,
  useAudioRecorderState,
  useAudioPlayer,
  useAudioPlayerStatus,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import { Directory, File, Paths } from "expo-file-system";
import { useAffirmationStore } from "../../store/useAffirmationStore";
import { reportError } from "../../services/sentry";

/** "busy": a start is already in flight (a double tap); nothing changed. */
export type RecordResult = "started" | "denied" | "error" | "busy";

/** Where starting a take broke down, shown under the button so a device report is actionable. */
export type RecordStep = "permission" | "mode" | "prepare" | "record" | "verify";

export interface RecordFailure {
  step: RecordStep;
  detail: string;
}

/** A native step that has not answered by now is treated as failed, never as "still starting". */
const STEP_TIMEOUT_MS = 6000;
/** How long after `record()` the recorder gets to report that it is really running. */
const VERIFY_DELAY_MS = 150;

class RecordStepError extends Error {
  constructor(
    readonly step: RecordStep,
    detail: string,
  ) {
    super(detail);
    this.name = "RecordStepError";
  }
}

function errorText(e: unknown): string {
  if (e instanceof Error) return e.message || e.name;
  return typeof e === "string" ? e : "unknown";
}

/**
 * Run one native step, tagging any failure with the step's name. With a
 * `timeoutMs` the step also has a deadline; the permission step has none,
 * because it waits on a person reading the system alert.
 */
async function runStep<T>(step: RecordStep, fn: () => T | Promise<T>, timeoutMs: number | null = STEP_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const work = Promise.resolve().then(fn);
  const deadline =
    timeoutMs === null
      ? null
      : new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new RecordStepError(step, "timeout")), timeoutMs);
        });
  try {
    return await (deadline ? Promise.race([work, deadline]) : work);
  } catch (e) {
    throw e instanceof RecordStepError ? e : new RecordStepError(step, errorText(e));
  } finally {
    clearTimeout(timer);
  }
}

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * One recorder and one player for the whole affirmations list — only one
 * affirmation can be recording or playing at a time, which is also what feels
 * right when you're speaking to yourself.
 *
 * Finished recordings are moved out of the recorder's temp file into
 * `<documents>/affirmations/<id>.<ext>` so the OS never purges them, and the
 * path is kept in the affirmation store. Nothing is uploaded anywhere.
 */
export function useAffirmationAudio() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);

  const recordings = useAffirmationStore((s) => s.recordings);
  const setRecording = useAffirmationStore((s) => s.setRecording);

  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  /** A start is in flight: permission, audio session and recorder are being set up. */
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  /** Why the last start failed, if it did; cleared by the next attempt. */
  const [failure, setFailure] = useState<RecordFailure | null>(null);

  // Playback ended on its own.
  useEffect(() => {
    if (playerStatus.didJustFinish) setPlayingId(null);
  }, [playerStatus.didJustFinish]);

  const stopPlayback = useCallback(() => {
    player.pause();
    setPlayingId(null);
  }, [player]);

  /**
   * Start a take. Every native step has a deadline and a name, and the take
   * only counts as started once the recorder itself says it is recording:
   * `record()` returns quietly (no error) when the recorder was not prepared,
   * which would otherwise look like a dead button. One retry covers an audio
   * session that comes back from the permission alert not yet active.
   */
  const startRecording = useCallback(
    async (id: string): Promise<RecordResult> => {
      if (startingRef.current) return "busy";
      startingRef.current = true;
      setStarting(true);
      setFailure(null);
      try {
        const perm = await runStep("permission", () => requestRecordingPermissionsAsync(), null);
        if (!perm.granted) return "denied";
        stopPlayback();
        await runStep("mode", () => setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }));
        let live = false;
        for (let attempt = 0; attempt < 2 && !live; attempt++) {
          await runStep("prepare", () => recorder.prepareToRecordAsync());
          await runStep("record", () => recorder.record());
          await pause(VERIFY_DELAY_MS);
          live = recorder.isRecording;
        }
        if (!live) throw new RecordStepError("verify", "recorder did not start");
        setRecordingId(id);
        return "started";
      } catch (e) {
        const f: RecordFailure =
          e instanceof RecordStepError ? { step: e.step, detail: e.message } : { step: "record", detail: errorText(e) };
        setFailure(f);
        reportError(e, { feature: "voice_record", step: f.step });
        setRecordingId(null);
        // A step that timed out may still start late: make sure the mic is not
        // left live with no UI to stop it.
        recorder.stop().catch(() => undefined);
        // Give the session back so playback elsewhere is not left in record mode.
        setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
        return "error";
      } finally {
        startingRef.current = false;
        setStarting(false);
      }
    },
    [recorder, stopPlayback],
  );

  /** `discard`: throw this take away and keep the previous recording (e.g. a slip of the thumb). */
  const stopRecording = useCallback(async (opts?: { discard?: boolean }) => {
    const id = recordingId;
    setRecordingId(null);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const tmp = recorder.uri;
      if (!id || !tmp) return;
      if (opts?.discard) {
        try {
          new File(tmp).delete();
        } catch {
          // The recorder's temp file is already gone.
        }
        return;
      }

      const dir = new Directory(Paths.document, "affirmations");
      dir.create({ intermediates: true, idempotent: true });
      const ext = tmp.slice(tmp.lastIndexOf(".")) || ".m4a";
      // A fresh name per take, so a re-record never collides with a file the
      // player might still hold open.
      const dest = new File(dir, `${id.replace(/[^\w.-]/g, "_")}-${Date.now()}${ext}`);
      await new File(tmp).move(dest);

      const previous = recordings[id];
      if (previous) {
        try {
          new File(previous).delete();
        } catch {
          // Already gone — nothing to clean up.
        }
      }
      setRecording(id, dest.uri);
    } catch (e) {
      // A failed take leaves any previous recording untouched.
      reportError(e, { feature: "voice_record", step: "stop" });
    }
  }, [recorder, recordingId, recordings, setRecording]);

  const togglePlay = useCallback(
    (id: string) => {
      const uri = recordings[id];
      if (!uri) return;
      if (playingId === id) {
        stopPlayback();
        return;
      }
      player.replace({ uri });
      player.seekTo(0).catch(() => {});
      player.play();
      setPlayingId(id);
    },
    [player, playingId, recordings, stopPlayback],
  );

  const deleteRecording = useCallback(
    (id: string) => {
      const uri = recordings[id];
      if (playingId === id) stopPlayback();
      if (uri) {
        try {
          new File(uri).delete();
        } catch {
          // File already removed; just drop the reference.
        }
      }
      setRecording(id, null);
    },
    [playingId, recordings, setRecording, stopPlayback],
  );

  return {
    recordingId,
    starting,
    failure,
    durationMs: recorderState.durationMillis ?? 0,
    playingId,
    hasRecording: (id: string) => !!recordings[id],
    startRecording,
    stopRecording,
    togglePlay,
    deleteRecording,
  };
}
