import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "recently_viewed";
const MAX = 10;

export async function getRecentIds(): Promise<string[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) ?? "[]");
  } catch {
    return [];
  }
}

// newest first, de-duplicated, capped
export async function addRecentId(id: string) {
  try {
    const ids = [id, ...(await getRecentIds()).filter((x) => x !== id)].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(ids));
  } catch {}
}
