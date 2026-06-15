import { colors } from '../lib/design-system';

export const theme = {
  dark: true,
  colors: {
    background: colors.surface.base,
    card: colors.surface.elevated,
    text: colors.text.primary,
    border: colors.border.subtle,
    notification: colors.primary.core,
    primary: colors.primary.core,
  },
} as const;
