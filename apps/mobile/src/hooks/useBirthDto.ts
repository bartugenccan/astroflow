import { useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import { CreateBirthProfileDto } from "../services/types";

/** Rebuilds the API request DTO from the persisted birth profile. */
export function useBirthDto(): CreateBirthProfileDto | null {
  const profile = useAppStore((s) => s.birthProfile);
  return useMemo(() => {
    if (!profile) return null;
    return {
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      latitude: profile.latitude,
      longitude: profile.longitude,
    };
  }, [profile]);
}
