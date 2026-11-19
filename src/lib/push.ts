import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { supabase } from "./supabase";

const TOKEN_KEY = "jella_push_token";
const native = Platform.OS !== "web";

if (native) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

let registered = false;

// Asks for permission (once, iOS never re-prompts) and stores this phone's Expo push token:
// against the landlord's account when signed in, otherwise against the renter's device id.
// ponytail: silently does nothing on web, simulators, denied permission and Android Expo Go (no remote push there).
export async function registerForPush(deviceId?: string) {
  if (!native || registered || !Device.isDevice) return;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", { name: "Messages", importance: Notifications.AndroidImportance.HIGH });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase.rpc("register_push_token", { p_token: token, p_device_id: deviceId ?? null });
    if (error) return;
    registered = true;
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

// Log out wrapper: stop this phone receiving the landlord's messages, then sign out.
export async function signOut() {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) await supabase.rpc("unregister_push_token", { p_token: token });
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {}
  registered = false;
  await supabase.auth.signOut();
}

type PushData = { type?: string; role?: "owner" | "renter"; conversationId?: string; name?: string; listingId?: string; title?: string };

function openChat(d: PushData | undefined) {
  if (d?.type !== "chat") return;
  if (d.role === "owner" && d.conversationId) {
    router.push({ pathname: "/(dashboard)/chat/[id]", params: { id: d.conversationId, name: d.name } });
  } else if (d.role === "renter" && d.listingId) {
    router.push({ pathname: "/(browse)/chat/[listingId]", params: { listingId: d.listingId, title: d.title } });
  }
}

// Tapping a notification opens that chat. `ready` = the navigator is mounted (not on the splash / onboarding).
export function usePushTaps(ready: boolean) {
  useEffect(() => {
    if (!native || !ready) return;
    Notifications.getLastNotificationResponseAsync().then((r) => r && openChat(r.notification.request.content.data as PushData));
    const sub = Notifications.addNotificationResponseReceivedListener((r) => openChat(r.notification.request.content.data as PushData));
    return () => sub.remove();
  }, [ready]);
}
