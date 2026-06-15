import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  colors,
  radii,
  spacing,
  typography,
  shadows,
} from "../../lib/design-system";

interface GlowButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function GlowButton({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  style,
}: GlowButtonProps) {
  const isPrimary = variant === "primary";

  const heightMap = { sm: 40, md: 52, lg: 60 };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[styles.wrapper, style]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={[colors.primary.core, colors.primary.light]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            {
              height: heightMap[size],
              paddingHorizontal: size === "sm" ? spacing.lg : spacing.xl,
              borderRadius: radii.full,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.primary} size="small" />
          ) : (
            <Text style={styles.label}>{label}</Text>
          )}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.ghost,
            {
              height: heightMap[size],
              paddingHorizontal: size === "sm" ? spacing.lg : spacing.xl,
              borderRadius: radii.full,
              borderColor:
                variant === "secondary"
                  ? colors.border.glow
                  : colors.border.subtle,
              borderWidth: variant === "secondary" ? 1 : 0,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.primary} size="small" />
          ) : (
            <Text
              style={[styles.label, variant === "ghost" && styles.ghostLabel]}
            >
              {label}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...shadows.glow,
  },
  gradient: {
    alignItems: "center",
    justifyContent: "center",
  },
  ghost: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface.elevated,
  },
  label: {
    ...typography.label,
    color: colors.text.primary,
    fontSize: 15,
  },
  ghostLabel: {
    color: colors.text.secondary,
  },
  shadow: {
    shadowColor: colors.primary.core,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
});
