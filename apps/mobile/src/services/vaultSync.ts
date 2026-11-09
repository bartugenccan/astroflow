import { USE_HTTP } from "./config";
import { ApiError, request } from "./httpAstrologyApi";
import { secureStorage } from "./secureStorage";
import { useAppStore } from "../store/useAppStore";
import { useAffirmationStore } from "../store/useAffirmationStore";
import { useReflectionStore } from "../store/useReflectionStore";
import { useTarotStore, type SavedTarotReading } from "../store/useTarotStore";
import { useElectionStore } from "../store/useElectionStore";
import type { Affirmation, AffirmationDay, ElectionQuery } from "./types";

/**
 * Encrypted backup of the notes the app otherwise keeps only on this phone
 * (reflections, affirmations, the last tarot reading, election questions), for
 * signed-in users only. The server seals each namespace at rest and never
 * reads or forwards it (PUT/GET /vault).
 *
 * Merging uses each store's own keys: per day / ritual / id, the copy already
 * on this phone wins and the backup fills in what's missing — so a new phone
 * gets everything back, and an edit on this phone is never overwritten.
 * Deleted custom affirmations are remembered (removedIds) so they stay gone.
 *
 * Safety: nothing is pushed in a session until the backup has been pulled
 * and merged once, and wiping the phone stops sync first — an emptied phone
 * can never overwrite the backup with nothing.
 */

type Namespace = "reflections" | "affirmations" | "tarot" | "election";

interface Adapter<T> {
  read(): T;
  write(value: T): void;
  merge(local: T, remote: T): T;
  subscribe(listener: () => void): () => void;
}

const preferLocal = <V>(local: Record<string, V>, remote: Record<string, V>): Record<string, V> => ({
  ...remote,
  ...local,
});

interface ReflectionsData {
  days: Record<string, string[]>;
  rituals: Record<string, string>;
}
interface AffirmationsData {
  customs: Affirmation[];
  removedIds: string[];
  days: Record<string, AffirmationDay>;
}
interface TarotData {
  lastReading: SavedTarotReading | null;
}
interface ElectionData {
  recent: { query: ElectionQuery; askedAt: string }[];
}

const ADAPTERS: { [K in Namespace]: Adapter<unknown> } = {
  reflections: {
    read: () => {
      const s = useReflectionStore.getState();
      return { days: s.days, rituals: s.rituals } satisfies ReflectionsData;
    },
    write: (v) => useReflectionStore.setState(v as ReflectionsData),
    merge: (l, r) => {
      const a = l as ReflectionsData;
      const b = r as ReflectionsData;
      return { days: preferLocal(a.days, b.days ?? {}), rituals: preferLocal(a.rituals, b.rituals ?? {}) };
    },
    subscribe: (fn) => useReflectionStore.subscribe(fn),
  },
  affirmations: {
    read: () => {
      const s = useAffirmationStore.getState();
      return { customs: s.customs, removedIds: s.removedIds, days: s.days } satisfies AffirmationsData;
    },
    write: (v) => useAffirmationStore.setState(v as AffirmationsData),
    merge: (l, r) => {
      const a = l as AffirmationsData;
      const b = r as AffirmationsData;
      const removed = [...new Set([...(a.removedIds ?? []), ...(b.removedIds ?? [])])].slice(0, 200);
      const byId = new Map<string, Affirmation>();
      for (const c of [...(b.customs ?? []), ...a.customs]) byId.set(c.id, c);
      const customs = [...byId.values()]
        .filter((c) => !removed.includes(c.id))
        .sort((x, y) => y.createdAt.localeCompare(x.createdAt));
      return { customs, removedIds: removed, days: preferLocal(a.days, b.days ?? {}) };
    },
    subscribe: (fn) => useAffirmationStore.subscribe(fn),
  },
  tarot: {
    read: () => ({ lastReading: useTarotStore.getState().lastReading }) satisfies TarotData,
    write: (v) => useTarotStore.setState(v as TarotData),
    merge: (l, r) => {
      const a = (l as TarotData).lastReading;
      const b = (r as TarotData).lastReading;
      if (!a) return { lastReading: b ?? null };
      if (!b) return { lastReading: a };
      return { lastReading: b.date > a.date ? b : a };
    },
    subscribe: (fn) => useTarotStore.subscribe(fn),
  },
  election: {
    read: () => ({ recent: useElectionStore.getState().recent }) satisfies ElectionData,
    write: (v) => useElectionStore.setState(v as ElectionData),
    merge: (l, r) => {
      const byAsked = new Map<string, ElectionData["recent"][number]>();
      for (const x of [...((r as ElectionData).recent ?? []), ...(l as ElectionData).recent]) byAsked.set(x.askedAt, x);
      const recent = [...byAsked.values()].sort((x, y) => y.askedAt.localeCompare(x.askedAt)).slice(0, 6);
      return { recent };
    },
    subscribe: (fn) => useElectionStore.subscribe(fn),
  },
};

const NAMESPACES = Object.keys(ADAPTERS) as Namespace[];
const META_KEY = "astroflow-vault-meta";
const PUSH_DEBOUNCE_MS = 3000;

interface VaultEntry {
  namespace: Namespace;
  version: number;
  blob: string;
  updatedAt: string;
}

/** Last version the server confirmed per namespace, and the JSON it holds. */
let meta: Partial<Record<Namespace, { version: number; json: string }>> = {};
/** Namespaces merged with the backup in this session; only these may push. */
const pulled = new Set<Namespace>();
const timers = new Map<Namespace, ReturnType<typeof setTimeout>>();
let unsubscribers: (() => void)[] = [];
/** True while sync writes into a store, so its own write doesn't schedule a push. */
let applying = false;
let running = false;

const signedIn = () => !!useAppStore.getState().account;

async function loadMeta(): Promise<void> {
  try {
    const raw = await secureStorage.getItem(META_KEY);
    meta = raw ? JSON.parse(raw) : {};
  } catch {
    meta = {};
  }
}

async function saveMeta(): Promise<void> {
  try {
    await secureStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Best effort: a lost version only means one extra 409 → merge round.
  }
}

function apply(ns: Namespace, value: unknown): void {
  applying = true;
  try {
    ADAPTERS[ns].write(value);
  } finally {
    applying = false;
  }
}

async function push(ns: Namespace, retry = true): Promise<void> {
  if (!running || !signedIn() || !pulled.has(ns)) return;
  const json = JSON.stringify(ADAPTERS[ns].read());
  if (meta[ns]?.json === json) return;
  try {
    const res = await request<VaultEntry>("PUT", `vault/${ns}`, { blob: json, baseVersion: meta[ns]?.version ?? 0 });
    meta[ns] = { version: res.version, json };
    await saveMeta();
  } catch (err) {
    const server = (err as ApiError)?.status === 409 ? (err as ApiError).body : null;
    const copy = (server as { server?: VaultEntry | null } | null)?.server;
    if (retry && copy) {
      // Someone (another phone) wrote first: fold their copy in, then try once more.
      apply(ns, ADAPTERS[ns].merge(ADAPTERS[ns].read(), JSON.parse(copy.blob)));
      meta[ns] = { version: copy.version, json: copy.blob };
      await push(ns, false);
    }
  }
}

function schedule(ns: Namespace): void {
  if (applying || !running) return;
  const t = timers.get(ns);
  if (t) clearTimeout(t);
  timers.set(
    ns,
    setTimeout(() => {
      timers.delete(ns);
      void push(ns);
    }, PUSH_DEBOUNCE_MS),
  );
}

/** Pull the backup, merge it into this phone, and push anything only this phone had. */
export async function syncVaultNow(): Promise<void> {
  if (!USE_HTTP || !running || !signedIn()) return;
  let entries: VaultEntry[];
  try {
    entries = await request<VaultEntry[]>("GET", "vault");
  } catch {
    return; // Offline or not configured: try again on the next foreground.
  }
  const byNs = new Map(entries.map((e) => [e.namespace, e]));
  for (const ns of NAMESPACES) {
    const remote = byNs.get(ns);
    if (remote) {
      try {
        apply(ns, ADAPTERS[ns].merge(ADAPTERS[ns].read(), JSON.parse(remote.blob)));
        meta[ns] = { version: remote.version, json: remote.blob };
      } catch {
        continue; // A blob this build can't read is left alone rather than overwritten.
      }
    } else {
      meta[ns] = { version: 0, json: "" };
    }
    pulled.add(ns);
    await push(ns);
  }
  await saveMeta();
}

/** Start syncing (call once at launch and after sign-in); a no-op while anonymous. */
export async function startVaultSync(): Promise<void> {
  if (!USE_HTTP || running) return;
  running = true;
  await loadMeta();
  unsubscribers = NAMESPACES.map((ns) => ADAPTERS[ns].subscribe(() => schedule(ns)));
  await syncVaultNow();
}

/** Stop syncing (sign-out, data wipe). Pending pushes are dropped, never flushed. */
export function stopVaultSync(): void {
  running = false;
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  for (const u of unsubscribers) u();
  unsubscribers = [];
  pulled.clear();
}

/** Forget versions too (data wipe / sign-out), so the next account starts clean. */
export async function resetVaultSync(): Promise<void> {
  stopVaultSync();
  meta = {};
  await secureStorage.removeItem(META_KEY);
}
