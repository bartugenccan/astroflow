import React from "react";
import { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { CX, CY, HEAD_TIP, LEFT_HAND, RIGHT_HAND, sparklePath } from "./asterShapes";

/**
 * Cosmetic layers bought with Yıldız Tozu. Back layers (auras, capes) are
 * drawn behind the body; front layers (hats, scarves, hand items) on top.
 * Coordinates are on the 200×200 artboard, already inside the stage scale.
 */

const AURAS: Record<string, string[]> = {
  auraCandy: ["#FF6FB5", "#FF6FB5"],
  auraMint: ["#2FD08A", "#4CC9F0"],
  auraNova: ["#FFD25C", "#7C4DFF"],
};

export function AccessoryBack({ ids }: { ids: string[] }) {
  const aura = ids.find((id) => id in AURAS);
  const cape = ids.includes("cometCape");
  return (
    <G>
      {aura ? (
        <>
          <Defs>
            <RadialGradient id="asterAura" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={AURAS[aura][0]} stopOpacity={0.55} />
              <Stop offset="0.6" stopColor={AURAS[aura][1]} stopOpacity={0.22} />
              <Stop offset="1" stopColor={AURAS[aura][1]} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={CX} cy={CY} r={96} fill="url(#asterAura)" />
        </>
      ) : null}
      {cape ? (
        <G>
          <Path d="M62 96 Q40 158 50 178 L150 178 Q160 158 138 96 Z" fill="#2A93B8" />
          <Path d="M62 92 Q42 154 54 172 L146 172 Q158 154 138 92 Z" fill="#4CC9F0" />
          <Path d={sparklePath(64, 150, 6)} fill="#FFF4D1" />
          <Path d={sparklePath(138, 140, 5)} fill="#FFF4D1" />
          <Path d={sparklePath(118, 166, 4)} fill="#FFF4D1" />
        </G>
      ) : null}
    </G>
  );
}

export function AccessoryFront({ ids }: { ids: string[] }) {
  const [hx, hy] = HEAD_TIP;
  const [lx, ly] = LEFT_HAND;
  const [rx, ry] = RIGHT_HAND;
  return (
    <G>
      {ids.includes("starScarf") ? (
        <G>
          <Path d="M64 136 Q100 152 136 136 L138 146 Q100 164 62 146 Z" fill="#C9407F" />
          <Path d="M64 132 Q100 148 136 132 L137 141 Q100 158 63 141 Z" fill="#FF6FB5" />
          <Path d="M116 146 L124 172 L136 168 L127 143 Z" fill="#FF6FB5" />
          <Rect x={86} y={139} width={6} height={6} rx={3} fill="#FFF4D1" />
          <Rect x={106} y={140} width={6} height={6} rx={3} fill="#FFF4D1" />
        </G>
      ) : null}

      {ids.includes("bow") ? (
        <G transform={`translate(${hx + 12} ${hy + 10}) rotate(22)`}>
          <Path d="M0 0 C -16 -14 -26 0 -18 8 C -12 12 -5 6 0 0 Z" fill="#FF6FB5" />
          <Path d="M0 0 C 16 -14 26 0 18 8 C 12 12 5 6 0 0 Z" fill="#FF6FB5" />
          <Circle cx={0} cy={1} r={5} fill="#C9407F" />
        </G>
      ) : null}

      {ids.includes("moonHat") ? (
        <G transform={`translate(${hx} ${hy + 8})`}>
          <Ellipse cx={0} cy={0} rx={30} ry={7} fill="#5530C9" />
          <Path d="M-20 -1 Q-6 -38 18 -46 Q8 -26 20 -1 Z" fill="#7C4DFF" />
          <Path d="M2 -24 a7 7 0 1 0 6 10 a5.5 5.5 0 1 1 -6 -10 Z" fill="#FFD25C" />
        </G>
      ) : null}

      {ids.includes("starCrown") ? (
        <G transform={`translate(${hx} ${hy + 6})`}>
          <Path
            d="M-24 4 L-20 -18 L-9 -6 L0 -24 L9 -6 L20 -18 L24 4 Z"
            fill="#FFC83D"
            stroke="#C99300"
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <Circle cx={0} cy={-6} r={3.5} fill="#FF6FB5" />
          <Circle cx={-13} cy={-2} r={2.5} fill="#4CC9F0" />
          <Circle cx={13} cy={-2} r={2.5} fill="#2FD08A" />
        </G>
      ) : null}

      {ids.includes("telescope") ? (
        <G transform={`translate(${rx - 6} ${ry - 4}) rotate(-28)`}>
          <Rect x={0} y={-6} width={30} height={12} rx={5} fill="#5530C9" />
          <Rect x={22} y={-8} width={12} height={16} rx={5} fill="#7C4DFF" />
          <Rect x={4} y={-3} width={14} height={3} rx={1.5} fill="#B9A2FF" />
        </G>
      ) : null}

      {ids.includes("crystal") ? (
        <G transform={`translate(${lx + 2} ${ly - 6})`}>
          <Path d="M0 -16 L10 -4 L0 14 L-10 -4 Z" fill="#7C4DFF" />
          <Path d="M0 -16 L4 -4 L0 14 L-10 -4 Z" fill="#B9A2FF" />
          <Path d={sparklePath(8, -16, 4)} fill="#FFF8FF" />
        </G>
      ) : null}
    </G>
  );
}
