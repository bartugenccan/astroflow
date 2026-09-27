import { useCallback, useEffect, useMemo } from "react";
import { AudioPlayer, useAudioPlayer } from "expo-audio";
import { useTarotStore } from "../../store/useTarotStore";

/**
 * Card sounds for the tarot table (Kenney "Casino Audio", CC0). The shuffle
 * loops for as long as the deck is being shuffled; the rest are one-shots.
 * Leaves the app-wide audio mode alone (the affirmation recorder owns it).
 */
export function useTarotSounds() {
  const soundOn = useTarotStore((s) => s.soundOn);
  const shuffle = useAudioPlayer(require("../../../assets/sounds/tarot-shuffle.m4a"));
  const fan = useAudioPlayer(require("../../../assets/sounds/tarot-fan.m4a"));
  const pick = useAudioPlayer(require("../../../assets/sounds/tarot-pick.m4a"));
  const flip = useAudioPlayer(require("../../../assets/sounds/tarot-flip.m4a"));

  useEffect(() => {
    shuffle.loop = true;
  }, [shuffle]);

  // Muting mid-shuffle stops the loop right away.
  useEffect(() => {
    if (!soundOn) shuffle.pause();
  }, [soundOn, shuffle]);

  const oneShot = useCallback(
    (player: AudioPlayer) => {
      if (!soundOn) return;
      try {
        player.seekTo(0);
        player.play();
      } catch {
        // A sound effect is never worth an error.
      }
    },
    [soundOn],
  );

  const startShuffle = useCallback(() => {
    if (!soundOn) return;
    try {
      shuffle.seekTo(0);
      shuffle.play();
    } catch {
      // Ignore — the shuffle still works silently.
    }
  }, [soundOn, shuffle]);

  const stopShuffle = useCallback(() => {
    try {
      shuffle.pause();
    } catch {
      // Already released.
    }
  }, [shuffle]);

  const playFan = useCallback(() => oneShot(fan), [oneShot, fan]);
  const playPick = useCallback(() => oneShot(pick), [oneShot, pick]);
  const playFlip = useCallback(() => oneShot(flip), [oneShot, flip]);

  return useMemo(
    () => ({ startShuffle, stopShuffle, playFan, playPick, playFlip }),
    [startShuffle, stopShuffle, playFan, playPick, playFlip],
  );
}

export type TarotSounds = ReturnType<typeof useTarotSounds>;
