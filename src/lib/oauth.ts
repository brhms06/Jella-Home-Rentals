import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";

function getRedirectUri() {
  return Platform.OS === "web" ? window.location.origin : Linking.createURL("/");
}

export async function signInWithGoogle() {
  const redirectTo = getRedirectUri();

  if (Platform.OS === "web") {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) throw error;
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) return;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === "success") {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
    if (exchangeError) throw exchangeError;
  }
}
