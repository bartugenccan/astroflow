/** Mirrored in apps/mobile/src/services/types.ts — keep both in sync. */
import type { NatalChartData, TransitReport } from '../astrology/astrology-adapter.service';
import type {
  AspectInterpretation,
  BigThreeReading,
  ChartContext,
  ChartOverview,
  HouseInterpretation,
  NodeAnalysis,
  PlacementInterpretation,
  TransitDetail,
  TransitOverview,
} from '../astrology/interpretation.types';
import type { TransitTimeline } from '../astrology/transit-timeline.service';

export const REPORT_KINDS = ['natal', 'transit'] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];
export type ReportStatus = 'queued' | 'running' | 'ready' | 'failed';

export interface ReportBirth {
  birthDate: string;
  birthTime: string;
  unknownTime: boolean;
  latitude: number;
  longitude: number;
  placeName?: string;
}

/** Counted from the chart, so the "balance" reading never invents its own numbers. */
export interface NatalBalance {
  elements: Record<'Fire' | 'Earth' | 'Air' | 'Water', number>;
  modalities: Record<'Cardinal' | 'Fixed' | 'Mutable', number>;
  dominantElement: string;
  dominantModality: string;
  /** Traditional ruler of the rising sign, and where it sits. Null without a birth time. */
  chartRuler: { planet: string; sign: string; house: number } | null;
}

export interface NatalExtras {
  balance: string;
  chartRuler: string;
  themes: { love: string; career: string; money: string; growth: string };
  closing: string;
}

export interface NatalReportData {
  kind: 'natal';
  name: string;
  birth: ReportBirth;
  generatedAt: string;
  chart: NatalChartData;
  bigThree: BigThreeReading;
  overview: ChartOverview;
  context: ChartContext;
  placements: PlacementInterpretation[];
  houses: HouseInterpretation[];
  aspects: AspectInterpretation[];
  nodes: NodeAnalysis;
  balance: NatalBalance;
  extras: NatalExtras;
}

export interface TransitSpotlight {
  eventId: string;
  title: string;
  text: string;
  howToUse: string;
}

export interface TransitQuarter {
  from: string;
  to: string;
  title: string;
  text: string;
  focus: string[];
}

export interface TransitReportData {
  kind: 'transit';
  name: string;
  birth: ReportBirth;
  generatedAt: string;
  chart: NatalChartData;
  today: { report: TransitReport; overview: TransitOverview; details: TransitDetail[] };
  timeline: TransitTimeline;
  spotlights: TransitSpotlight[];
  quarters: TransitQuarter[];
}

export type ReportData = NatalReportData | TransitReportData;

export interface ReportMeta {
  id: string;
  kind: ReportKind;
  status: ReportStatus;
  progress: number;
  total: number;
  stage: string | null;
  name: string;
  locale: string;
  createdAt: string;
  error: string | null;
}
