import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "skipped_listings";
const DAY = 86_400_000;

// How long a skipped listing stays out of Discover before it may quietly come back. Tune these two numbers.
export const SKIP_RESHOW_DAYS = 60;
// Boosted (paid) listings return much sooner, but still not on every pass.
export const BOOSTED_RESHOW_DAYS = 3;

type SkipMap = Record<string, number>; // listing id -> epoch ms when skipped

export async function getSkipped(): Promise<SkipMap> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) ?? "{}");
  } catch {
    return {};
  }
}

async function write(map: SkipMap) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
}

export async function markSkipped(id: string) {
  const map = await getSkipped();
  map[id] = Date.now();
  await write(map);
}

export async function unmarkSkipped(id: string) {
  const map = await getSkipped();
  delete map[id];
  await write(map);
}

// True while a skipped listing should stay hidden.
export function isStillHidden(skippedAt: number | undefined, boosted: boolean | undefined, now = Date.now()) {
  if (skippedAt === undefined) return false;
  return now - skippedAt < (boosted ? BOOSTED_RESHOW_DAYS : SKIP_RESHOW_DAYS) * DAY;
}
