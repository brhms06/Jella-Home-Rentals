import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "saved_searches";
const MAX = 10;

export type SearchState = {
  city: string;
  minPrice: string;
  maxPrice: string;
  minBedrooms: string;
  minBathrooms: string;
  unitType: string;
  category: string;
  sort: string;
};
export type SavedSearch = { id: string; label: string; state: SearchState };

export async function getSavedSearches(): Promise<SavedSearch[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) ?? "[]");
  } catch {
    return [];
  }
}

const isEmpty = (s: SearchState) =>
  !s.city && !s.minPrice && !s.maxPrice && !s.minBedrooms && !s.minBathrooms && !s.unitType && s.category === "all";

// "Lagos · $200-$500 · 2+ beds"
export function describeSearch(s: SearchState) {
  const parts = [s.city || "Anywhere"];
  if (s.minPrice || s.maxPrice) parts.push(`$${s.minPrice || 0}-${s.maxPrice ? "$" + s.maxPrice : "any"}`);
  if (s.minBedrooms) parts.push(`${s.minBedrooms}+ beds`);
  if (s.category !== "all") parts.push(s.category.replace(/_/g, " "));
  return parts.join(" · ");
}

// Newest first, de-duplicated by content, capped. Returns the new list (unchanged when the search is empty).
export async function saveSearch(state: SearchState): Promise<SavedSearch[]> {
  const list = await getSavedSearches();
  if (isEmpty(state)) return list;
  const key = JSON.stringify(state);
  const next = [
    { id: String(Date.now()), label: describeSearch(state), state },
    ...list.filter((x) => JSON.stringify(x.state) !== key),
  ].slice(0, MAX);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export async function removeSavedSearch(id: string): Promise<SavedSearch[]> {
  const next = (await getSavedSearches()).filter((x) => x.id !== id);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  return next;
}
