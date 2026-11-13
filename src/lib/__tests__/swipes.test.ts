import AsyncStorage from "@react-native-async-storage/async-storage";
import { BOOSTED_RESHOW_DAYS, SKIP_RESHOW_DAYS, getSkipped, isStillHidden, markSkipped, unmarkSkipped } from "../swipes";

const DAY = 86_400_000;
const NOW = 1_700_000_000_000;

beforeEach(() => AsyncStorage.clear());

describe("isStillHidden", () => {
  it("never hides a listing that was not skipped", () => {
    expect(isStillHidden(undefined, false, NOW)).toBe(false);
    expect(isStillHidden(undefined, true, NOW)).toBe(false);
  });

  it("hides a normal listing until SKIP_RESHOW_DAYS have passed", () => {
    expect(isStillHidden(NOW - (SKIP_RESHOW_DAYS - 1) * DAY, false, NOW)).toBe(true);
    expect(isStillHidden(NOW - (SKIP_RESHOW_DAYS + 1) * DAY, false, NOW)).toBe(false);
  });

  it("brings boosted listings back much sooner", () => {
    expect(BOOSTED_RESHOW_DAYS).toBeLessThan(SKIP_RESHOW_DAYS);
    expect(isStillHidden(NOW - (BOOSTED_RESHOW_DAYS - 1) * DAY, true, NOW)).toBe(true);
    expect(isStillHidden(NOW - (BOOSTED_RESHOW_DAYS + 1) * DAY, true, NOW)).toBe(false);
    // the same age that is still hidden for a normal listing is already back for a boosted one
    const skippedAt = NOW - 10 * DAY;
    expect(isStillHidden(skippedAt, false, NOW)).toBe(true);
    expect(isStillHidden(skippedAt, true, NOW)).toBe(false);
  });
});

describe("skip storage", () => {
  it("records and removes skips", async () => {
    await markSkipped("a");
    await markSkipped("b");
    expect(Object.keys(await getSkipped()).sort()).toEqual(["a", "b"]);
    await unmarkSkipped("a");
    expect(Object.keys(await getSkipped())).toEqual(["b"]);
  });

  it("survives corrupt storage", async () => {
    await AsyncStorage.setItem("skipped_listings", "{not json");
    expect(await getSkipped()).toEqual({});
  });
});
