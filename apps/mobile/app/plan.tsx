import React, { useCallback } from "react";
import { ReadingPage } from "../src/components/ReadingPage";
import { SkyPlanCard } from "../src/features/today/SkyPlanCard";
import { useBirthDto } from "../src/hooks/useBirthDto";
import { usePlanStore } from "../src/store/usePlanStore";
import { useMascot } from "../src/features/aster/useMascot";
import { useTranslation } from "../src/i18n";

/** `/plan` — the whole personal sky plan for today (Today shows its next steps). */
export default function PlanRoute() {
  const { t } = useTranslation();
  const dto = useBirthDto();
  const plan = usePlanStore((s) => s.plan);
  const loading = usePlanStore((s) => s.loading);
  const error = usePlanStore((s) => s.error);
  const refresh = usePlanStore((s) => s.refresh);
  const { state } = useMascot();
  const retry = useCallback(() => {
    if (dto) refresh(dto);
  }, [dto, refresh]);
  return (
    <ReadingPage title={t("today.fullPlan")}>
      <SkyPlanCard plan={plan} loading={loading} error={error} onRetry={retry} state={state} initiallyOpen />
    </ReadingPage>
  );
}
