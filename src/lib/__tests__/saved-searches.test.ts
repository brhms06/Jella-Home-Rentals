import AsyncStorage from "@react-native-async-storage/async-storage";
import { describeSearch, getSavedSearches, removeSavedSearch, saveSearch, type SearchState } from "../saved-searches";

const base: SearchState = { city: "", minPrice: "", maxPrice: "", minBedrooms: "", minBathrooms: "", unitType: "", category: "all", sort: "newest" };

beforeEach(() => AsyncStorage.clear());

describe("describeSearch", () => {
  it("describes a rich search in XAF", () => {
    expect(describeSearch({ ...base, city: "Buea", minPrice: "50000", maxPrice: "120000", minBedrooms: "2", category: "guest_house" })).toBe(
      "Buea · 50000-120000 XAF · 2+ beds · guest house"
    );
  });

  it("falls back to Anywhere", () => {
    expect(describeSearch({ ...base, maxPrice: "90000" })).toBe("Anywhere · 0-90000 XAF");
  });
});

describe("saveSearch", () => {
  it("ignores an empty search", async () => {
    expect(await saveSearch(base)).toEqual([]);
  });

  it("de-duplicates identical searches and keeps the newest first", async () => {
    await saveSearch({ ...base, city: "Buea" });
    await saveSearch({ ...base, city: "Limbe" });
    const list = await saveSearch({ ...base, city: "Buea" });
    expect(list.map((s) => s.state.city)).toEqual(["Buea", "Limbe"]);
  });

  it("keeps at most 10", async () => {
    for (let i = 0; i < 12; i++) await saveSearch({ ...base, city: `City ${i}` });
    const list = await getSavedSearches();
    expect(list).toHaveLength(10);
    expect(list[0].state.city).toBe("City 11");
  });

  it("removes one by id", async () => {
    const [a] = await saveSearch({ ...base, city: "Buea" });
    expect(await removeSavedSearch(a.id)).toEqual([]);
  });
});
