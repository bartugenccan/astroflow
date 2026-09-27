import React, { memo } from "react";
import { Image, StyleSheet, View } from "react-native";
import { colors } from "../../lib/design-system";
import { TAROT_IMAGES } from "./cardImages";

interface Props {
  cardId: string;
  reversed: boolean;
  width: number;
  height: number;
}

/** The card art in a thin gold frame; reversed cards are shown upside down, as drawn. */
export const TarotCardFace = memo(function TarotCardFace({ cardId, reversed, width, height }: Props) {
  const radius = Math.max(6, width * 0.07);
  return (
    <View style={[styles.frame, { width, height, borderRadius: radius }]}>
      <Image
        source={TAROT_IMAGES[cardId]}
        resizeMode="cover"
        style={[
          { width: "100%", height: "100%" },
          reversed && styles.reversed,
        ]}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.gold[400],
    backgroundColor: colors.gold[100],
  },
  reversed: {
    transform: [{ rotate: "180deg" }],
  },
});
