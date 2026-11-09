import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  useReducedMotion,
  SharedValue,
  useAnimatedRef,
  scrollTo,
  runOnUI,
} from "react-native-reanimated";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { Glyph } from "../../components/Glyph";
import { AsterMascot } from "../../components/aster/AsterMascot";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { PressableScale } from "../../components/ui/PressableScale";
import { useOnboardingDraft } from "../../store/useOnboardingDraft";
import { useAppStore } from "../../store/useAppStore";
import { syncProfileMeta } from "../../services/auth/account";
import { useTranslation, TranslationKey } from "../../i18n";
import { colors, spacing, radii, palette, surface } from "../../lib/design-system";

interface Slide {
  eyebrow: TranslationKey;
  title: TranslationKey;
  body: TranslationKey;
  icon: keyof typeof Ionicons.glyphMap;
  /** Optional bullet list shown under the body (`glyph` is a Glyph name). */
  points?: { glyph: string; key: TranslationKey }[];
  /** Show Aster's egg instead of the icon. */
  aster?: boolean;
}

const SLIDES: Slide[] = [
  {
    eyebrow: "tour.s1Eyebrow",
    title: "tour.s1Title",
    body: "tour.s1Body",
    icon: "planet-outline",
    points: [
      { glyph: "Sun", key: "tour.s1Sun" },
      { glyph: "Moon", key: "tour.s1Moon" },
      { glyph: "Ascendant", key: "tour.s1Rising" },
    ],
  },
  { eyebrow: "tour.s2Eyebrow", title: "tour.s2Title", body: "tour.s2Body", icon: "telescope-outline" },
  { eyebrow: "tour.s3Eyebrow", title: "tour.s3Title", body: "tour.s3Body", icon: "sunny-outline" },
  {
    eyebrow: "tour.s4Eyebrow",
    title: "tour.s4Title",
    body: "tour.s4Body",
    icon: "information-circle-outline",
  },
  {
    eyebrow: "aster.meet.eyebrow",
    title: "aster.meet.title",
    body: "aster.meet.body",
    icon: "star",
    aster: true,
  },
];

/**
 * Five swipeable cards between the chart reveal and the app: what a birth
 * chart is, what the daily sky does, where the yearly birthday chart lives,
 * that every unknown word has an ⓘ, and meeting Aster (still an egg — the
 * first intention hatches it). Skippable at any point; finishing
 * (or skipping) is what completes onboarding.
 */
export function TourScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const profile = useOnboardingDraft((s) => s.profile);
  const name = useOnboardingDraft((s) => s.name);
  const clearDraft = useOnboardingDraft((s) => s.clear);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const x = useSharedValue(0);
  const [page, setPage] = useState(0);
  const finishing = useRef(false);

  // The draft is in-memory only; after a reload there is no cast chart to
  // finish with, so start onboarding over rather than stranding the user.
  useEffect(() => {
    if (!profile) router.replace("/(onboarding)" as Href);
  }, [profile, router]);

  const onScroll = useAnimatedScrollHandler((e) => {
    x.value = e.contentOffset.x;
  });

  const finish = () => {
    if (!profile || finishing.current) return;
    finishing.current = true;
    // Flipping `hasOnboarded` swaps the protected stacks; the root layout
    // crossfades from onboarding into the tabs.
    completeOnboarding(name.trim() || "Traveler", profile);
    clearDraft();
    // Name + birth place label go next to the server chart, so a later sign-in restores them.
    syncProfileMeta();
  };

  const last = page === SLIDES.length - 1;
  const next = () => {
    if (last) return finish();
    const target = (page + 1) * width;
    // Programmatic scrolls don't reliably emit momentum-end on every
    // platform, so advance the page state here too.
    setPage(page + 1);
    runOnUI((to: number) => {
      "worklet";
      scrollTo(scrollRef, to, 0, !reduced);
    })(target);
  };

  if (!profile) return null;

  return (
    <ScreenWrapper variant="dense" edges={["top", "bottom"]}>
      <View style={styles.top}>
        <PressableScale
          onPress={finish}
          hitSlop={12}
          scaleTo={0.9}
          style={[styles.skip, last && styles.hidden]}
          disabled={last}
        >
          <AppText variant="heading" color={colors.text.secondary}>
            {t("tour.skip")}
          </AppText>
        </PressableScale>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        style={styles.pager}
      >
        {SLIDES.map((s, i) => (
          <SlideView key={s.title} slide={s} index={i} x={x} width={width} />
        ))}
      </Animated.ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <Dot key={s.title} index={i} x={x} width={width} />
          ))}
        </View>
        <ChunkyButton
          label={last ? t("tour.start") : t("tour.next")}
          onPress={next}
          icon={
            last ? undefined : (
              <Ionicons name="arrow-forward" size={18} color={colors.text.onPrimary} />
            )
          }
        />
      </View>
    </ScreenWrapper>
  );
}

function SlideView({
  slide,
  index,
  x,
  width,
}: {
  slide: Slide;
  index: number;
  x: SharedValue<number>;
  width: number;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const range = [(index - 1) * width, index * width, (index + 1) * width];

  // Parallax: the icon travels faster than the page and swells as it
  // centers; the text trails slightly and fades at the edges.
  const iconStyle = useAnimatedStyle(() => {
    if (reduced) return {};
    return {
      opacity: interpolate(x.value, range, [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(x.value, range, [width * 0.35, 0, -width * 0.35], Extrapolation.CLAMP) },
        { scale: interpolate(x.value, range, [0.6, 1, 0.6], Extrapolation.CLAMP) },
        { rotate: `${interpolate(x.value, range, [-25, 0, 25], Extrapolation.CLAMP)}deg` },
      ],
    };
  });
  const textStyle = useAnimatedStyle(() => {
    if (reduced) return {};
    return {
      opacity: interpolate(x.value, range, [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(x.value, range, [width * 0.12, 0, -width * 0.12], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <View style={[styles.slide, { width }]}>
      {slide.aster ? (
        <Animated.View style={iconStyle}>
          <AsterMascot stage={0} mood="sleepy" size={170} />
        </Animated.View>
      ) : (
        <Animated.View style={[styles.iconOrb, iconStyle]}>
          <Ionicons name={slide.icon} size={56} color={colors.star[200]} />
        </Animated.View>
      )}
      <Animated.View style={[styles.textBlock, textStyle]}>
        <AppText variant="label" color={colors.text.accent} center>
          {t(slide.eyebrow)}
        </AppText>
        <AppText
          variant="title"
          center
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {t(slide.title)}
        </AppText>
        <AppText variant="body" center>
          {t(slide.body)}
        </AppText>
        {slide.points ? (
          <View style={styles.points}>
            {slide.points.map((p) => (
              <View key={p.key} style={styles.point}>
                <View style={styles.pointGlyph}>
                  <Glyph name={p.glyph} size={18} color={colors.star[200]} />
                </View>
                <AppText variant="body" color={colors.text.primary} style={styles.pointText}>
                  {t(p.key)}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

function Dot({ index, x, width }: { index: number; x: SharedValue<number>; width: number }) {
  const style = useAnimatedStyle(() => {
    const range = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      width: interpolate(x.value, range, [8, 24, 8], Extrapolation.CLAMP),
      opacity: interpolate(x.value, range, [0.35, 1, 0.35], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    minHeight: 40,
  },
  skip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  hidden: {
    opacity: 0,
  },
  pager: {
    flex: 1,
  },
  slide: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxl,
  },
  iconOrb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primary.face,
    borderBottomWidth: 7,
    borderBottomColor: palette.primary.slab,
  },
  textBlock: {
    gap: spacing.md,
    alignItems: "center",
    width: "100%",
  },
  points: {
    alignSelf: "stretch",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  point: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: surface.card,
  },
  pointGlyph: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: surface.sheet,
  },
  pointText: {
    flex: 1,
    minWidth: 0,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xl,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.star[300],
  },
});
