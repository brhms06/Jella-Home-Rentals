import { useEffect, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { getDeviceId } from "./device";

export type ChatMessage = { id: string; sender: "renter" | "owner"; body: string; created_at: string };
export type RenterConversation = {
  id: string;
  listing_id: string;
  listing_title: string;
  photo: string | null;
  last_message: string | null;
  last_message_at: string;
  unread: number;
};
export type OwnerConversation = {
  id: string;
  listing_id: string;
  listing_title: string;
  renter_name: string;
  last_message: string | null;
  last_message_at: string;
  unread: number;
};

// The renter's display name is asked once and remembered on this device.
const NAME_KEY = "jella_renter_name";
export const getSavedName = () => AsyncStorage.getItem(NAME_KEY).then((v) => v ?? "").catch(() => "");
export const saveName = (name: string) => AsyncStorage.setItem(NAME_KEY, name.trim()).catch(() => {});

async function rpc<T>(fn: string, args?: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export const renterSend = (listingId: string, deviceId: string, name: string, body: string) =>
  rpc<void>("renter_send_message", { p_listing_id: listingId, p_device_id: deviceId, p_name: name, p_body: body });
export const renterMessages = (listingId: string, deviceId: string) =>
  rpc<ChatMessage[]>("renter_messages", { p_listing_id: listingId, p_device_id: deviceId });
export const renterConversations = (deviceId: string) =>
  rpc<RenterConversation[]>("renter_conversations", { p_device_id: deviceId });

export const ownerConversations = () => rpc<OwnerConversation[]>("owner_conversations");
export const ownerMessages = (conversationId: string) =>
  rpc<ChatMessage[]>("owner_messages", { p_conversation_id: conversationId });
export const ownerSend = (conversationId: string, body: string) =>
  rpc<void>("owner_send_message", { p_conversation_id: conversationId, p_body: body });

// Unread replies for the renter's Messages tab badge.
export function useRenterUnread() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const refresh = () =>
      getDeviceId()
        .then(renterConversations)
        .then((c) => alive && setCount(c.reduce((n, x) => n + x.unread, 0)))
        .catch(() => {});
    refresh();
    const timer = setInterval(refresh, 20_000);
    const sub = AppState.addEventListener("change", (s) => s === "active" && refresh());
    return () => {
      alive = false;
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  return count;
}
