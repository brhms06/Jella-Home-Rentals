import { useEffect, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { fetchFavoriteIds } from "./favorites";
import { getDeviceId } from "./device";

const SEEN_KEY = "price_drops_seen"; // listing id -> dropped_at we already showed the badge for

export type PriceDrop = { listing_id: string; previous_price: number; price: number; dropped_at: string };

export async function fetchPriceDrops(ids: string[]) {
  const map = new Map<string, PriceDrop>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase.rpc("price_drops", { p_ids: ids });
  if (error) throw error;
  for (const r of data as PriceDrop[]) map.set(r.listing_id, { ...r, previous_price: Number(r.previous_price), price: Number(r.price) });
  return map;
}

async function getSeen(): Promise<Record<string, string>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(SEEN_KEY)) ?? "{}");
  } catch {
    return {};
  }
}

const listeners = new Set<() => void>();

export async function markDropsSeen(drops: Map<string, PriceDrop>) {
  const seen = await getSeen();
  drops.forEach((d, id) => (seen[id] = d.dropped_at));
  try {
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {}
  listeners.forEach((l) => l());
}

// Wishlist tab badge: saved listings whose price dropped and that the renter hasn't looked at yet.
export function useUnseenDropCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const ids = [...(await fetchFavoriteIds(await getDeviceId()))];
        const [drops, seen] = await Promise.all([fetchPriceDrops(ids), getSeen()]);
        if (alive) setCount([...drops.values()].filter((d) => seen[d.listing_id] !== d.dropped_at).length);
      } catch {}
    };
    refresh();
    listeners.add(refresh);
    const sub = AppState.addEventListener("change", (s) => s === "active" && refresh());
    return () => {
      alive = false;
      listeners.delete(refresh);
      sub.remove();
    };
  }, []);
  return count;
}
