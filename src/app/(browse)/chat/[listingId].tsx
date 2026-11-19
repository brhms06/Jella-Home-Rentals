import { useEffect, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { getDeviceId } from "@/lib/device";
import { getSavedName, renterMessages, renterSend } from "@/lib/chat";
import { ChatScreen } from "@/components/chat-thread";
import { registerForPush } from "@/lib/push";

export default function RenterChat() {
  const { listingId, title } = useLocalSearchParams<{ listingId: string; title?: string }>();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    getDeviceId().then(setDeviceId);
    getSavedName().then(setName);
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: title ?? "Chat" }} />
      {deviceId && (
        <ChatScreen
          me="renter"
          load={() => renterMessages(listingId, deviceId)}
          send={(body) => renterSend(listingId, deviceId, name || "Renter", body).then(() => void registerForPush(deviceId))}
        />
      )}
    </>
  );
}
