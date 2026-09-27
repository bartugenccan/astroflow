import { useCallback, useEffect, useState } from "react";
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

export type RecordResult = "started" | "denied" | "error";

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

  // Playback ended on its own.
  useEffect(() => {
    if (playerStatus.didJustFinish) setPlayingId(null);
  }, [playerStatus.didJustFinish]);

  const stopPlayback = useCallback(() => {
    player.pause();
    setPlayingId(null);
  }, [player]);

  const startRecording = useCallback(
    async (id: string): Promise<RecordResult> => {
      try {
        const perm = await requestRecordingPermissionsAsync();
        if (!perm.granted) return "denied";
        stopPlayback();
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        setRecordingId(id);
        return "started";
      } catch {
        setRecordingId(null);
        return "error";
      }
    },
    [recorder, stopPlayback],
  );

  const stopRecording = useCallback(async () => {
    const id = recordingId;
    setRecordingId(null);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const tmp = recorder.uri;
      if (!id || !tmp) return;

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
    } catch {
      // A failed take leaves any previous recording untouched.
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
    durationMs: recorderState.durationMillis ?? 0,
    playingId,
    hasRecording: (id: string) => !!recordings[id],
    startRecording,
    stopRecording,
    togglePlay,
    deleteRecording,
  };
}
