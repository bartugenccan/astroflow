import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { CormorantGaramond_500Medium_Italic, CormorantGaramond_600SemiBold } from "@expo-google-fonts/cormorant-garamond";
import { Manrope_400Regular, Manrope_700Bold } from "@expo-google-fonts/manrope";
import { EmbeddedFont, fontFaceCss } from "./reportStyles";

const FACES: { family: EmbeddedFont["family"]; weight: number; style: EmbeddedFont["style"]; module: number }[] = [
  { family: "Cormorant", weight: 600, style: "normal", module: CormorantGaramond_600SemiBold },
  { family: "Cormorant", weight: 500, style: "italic", module: CormorantGaramond_500Medium_Italic },
  { family: "Manrope", weight: 400, style: "normal", module: Manrope_400Regular },
  { family: "Manrope", weight: 700, style: "normal", module: Manrope_700Bold },
];

let cached: Promise<string> | null = null;

/**
 * The app's own fonts as inline `@font-face` rules for the print web view,
 * read once from the bundled assets. If anything fails the PDF still renders
 * with the system serif/sans fallbacks in the stylesheet, so this never throws.
 */
export function loadPdfFonts(): Promise<string> {
  if (!cached) {
    cached = (async () => {
      const fonts = await Promise.all(
        FACES.map(async (face) => {
          const asset = Asset.fromModule(face.module);
          if (!asset.localUri) await asset.downloadAsync();
          const base64 = await new File(asset.localUri ?? asset.uri).base64();
          return { family: face.family, weight: face.weight, style: face.style, base64 };
        }),
      );
      return fontFaceCss(fonts);
    })().catch(() => {
      cached = null;
      return "";
    });
  }
  return cached;
}
