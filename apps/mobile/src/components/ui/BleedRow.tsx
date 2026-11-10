import React, { forwardRef } from "react";
import { ScrollView, type ScrollViewInstance, type ScrollViewProps } from "react-native";
import { layout } from "../../lib/design-system";

export interface BleedRowProps extends Omit<ScrollViewProps, "horizontal"> {
  /**
   * The parent's horizontal padding that this row cancels. Defaults to the
   * screen gutter; pass the container's own padding when it differs.
   */
  gutter?: number;
  /** Extra room after the last item, e.g. a carousel's peek so the last card can snap. */
  endExtra?: number;
}

/**
 * A horizontal scroller that runs edge to edge. It pulls itself out of the
 * parent's gutter with a negative margin and puts the same gutter back as
 * content padding, so the first and last items line up with the rest of the
 * screen while the content in between slides all the way to the screen edge.
 *
 * Use it only inside a container padded by exactly `gutter`.
 */
export const BleedRow = forwardRef<ScrollViewInstance, BleedRowProps>(function BleedRow(
  { gutter = layout.gutter, endExtra = 0, style, contentContainerStyle, showsHorizontalScrollIndicator = false, ...rest },
  ref,
) {
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
      style={[{ marginHorizontal: -gutter }, style]}
      contentContainerStyle={[
        { paddingLeft: gutter, paddingRight: gutter + endExtra },
        contentContainerStyle,
      ]}
      {...rest}
    />
  );
});

