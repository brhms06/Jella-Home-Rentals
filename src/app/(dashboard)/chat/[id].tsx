import { Stack, useLocalSearchParams } from "expo-router";
import { ownerMessages, ownerSend } from "@/lib/chat";
import { ChatScreen } from "@/components/chat-thread";

export default function OwnerChat() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  return (
    <>
      <Stack.Screen options={{ title: name ?? "Chat" }} />
      <ChatScreen me="owner" load={() => ownerMessages(id)} send={(body) => ownerSend(id, body)} />
    </>
  );
}
