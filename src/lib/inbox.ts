import { useEffect, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { fetchOwnerRequests } from "./viewing-requests";

const SEEN_KEY = "inbox_seen_at";

export type ContactEvent = { id: string; listing_id: string; listing_title: string; event: "contact" | "arrived"; created_at: string };

export async function fetchContactEvents() {
  const { data, error } = await supabase.rpc("owner_contact_events", { p_limit: 50 });
  if (error) throw error;
  return data as ContactEvent[];
}

export async function getSeenAt(): Promise<number> {
  try {
    return Number((await AsyncStorage.getItem(SEEN_KEY)) ?? 0);
  } catch {
    return 0;
  }
}

const listeners = new Set<() => void>();

export async function markInboxSeen() {
  try {
    await AsyncStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch {}
  listeners.forEach((l) => l());
}

// Needs-attention count: pending viewing requests (always) + contacts since the inbox was last opened.
export async function fetchInboxCount() {
  const [requests, contacts, seen] = await Promise.all([fetchOwnerRequests(), fetchContactEvents(), getSeenAt()]);
  return requests.filter((r) => r.status === "pending").length + contacts.filter((c) => new Date(c.created_at).getTime() > seen).length;
}

export function useInboxCount(enabled: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const refresh = () => fetchInboxCount().then((n) => alive && setCount(n)).catch(() => {});
    refresh();
    listeners.add(refresh);
    const timer = setInterval(refresh, 60_000);
    const sub = AppState.addEventListener("change", (s) => s === "active" && refresh());
    return () => {
      alive = false;
      listeners.delete(refresh);
      clearInterval(timer);
      sub.remove();
    };
  }, [enabled]);
  return count;
}

export function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
