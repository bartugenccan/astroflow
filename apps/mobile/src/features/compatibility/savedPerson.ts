import { useMemo } from "react";
import { CreateBirthProfileDto, SavedPerson } from "../../services/types";
import { useAppStore, FREE_PERSON_CHARTS } from "../../store/useAppStore";
import { useAsync } from "../../hooks/useAsync";
import { astrologyApi } from "../../services/astrologyApi";

/** Load a saved person by id from the device's people list. */
export function usePerson(id: string | undefined): {
  person: SavedPerson | null;
  loading: boolean;
} {
  const people = useAsync(() => astrologyApi.listPeople(), []);
  const person = useMemo(
    () => people.data?.find((p) => p.id === id) ?? null,
    [people.data, id],
  );
  return { person, loading: people.loading };
}

/** Build an API birth DTO from a saved person (unknown time → noon). */
export function savedPersonToDto(person: SavedPerson): CreateBirthProfileDto {
  return {
    birthDate: person.birthDate,
    birthTime: person.unknownTime ? "12:00" : person.birthTime,
    latitude: person.latitude,
    longitude: person.longitude,
  };
}

/**
 * Whether this person's charts may be viewed: Premium unlocks all, already-viewed
 * people stay free, and the first `FREE_PERSON_CHARTS` distinct people are free.
 */
export function usePersonChartAccess(id: string | undefined): {
  allowed: boolean;
  markViewed: (id: string) => void;
} {
  const isPremium = useAppStore((s) => s.isPremium);
  const viewed = useAppStore((s) => s.viewedPersonChartIds);
  const markViewed = useAppStore((s) => s.markPersonChartViewed);
  const allowed =
    isPremium ||
    (!!id && viewed.includes(id)) ||
    viewed.length < FREE_PERSON_CHARTS;
  return { allowed, markViewed };
}
