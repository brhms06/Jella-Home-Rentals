import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, AppState, KeyboardAvoidingView, Platform, type ScrollViewInstance } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Skeleton } from "@/components/ui/skeleton";
import { tap } from "@/lib/haptics";
import type { ChatMessage } from "@/lib/chat";

const POLL_MS = 4000;

// One chat thread, used by the renter (inline on the unlocked listing and on its own screen) and the landlord.
// ponytail: polls every few seconds while open; push notifications cover the "app closed" case, Realtime is the upgrade.
export function ChatThread({
  me,
  load,
  send,
  maxHeight,
}: {
  me: ChatMessage["sender"];
  load: () => Promise<ChatMessage[]>;
  send: (body: string) => Promise<void>;
  maxHeight?: number;
}) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  // optimistic bubbles: shown instantly, kept (with a retry) if sending fails
  const [pending, setPending] = useState<{ key: string; body: string; failed?: boolean }[]>([]);
  const scroller = useRef<ScrollViewInstance>(null);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  const seq = useRef(0);

  const refresh = useCallback(() => {
    loadRef.current().then((m) => { setMessages(m); setLoaded(true); }).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(() => AppState.currentState === "active" && refresh(), POLL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  async function submit(retry?: { key: string; body: string }) {
    const body = (retry?.body ?? text).trim();
    if (!body) return;
    tap();
    const key = retry?.key ?? String(++seq.current);
    if (retry) setPending((p) => p.map((x) => (x.key === key ? { ...x, failed: false } : x)));
    else {
      setText("");
      setPending((p) => [...p, { key, body }]);
    }
    try {
      await send(body);
      const fresh = await loadRef.current().catch(() => null);
      if (fresh) setMessages(fresh);
      setPending((p) => p.filter((x) => x.key !== key));
    } catch {
      setPending((p) => p.map((x) => (x.key === key ? { ...x, failed: true } : x)));
    }
  }

  return (
    <View style={[styles.wrap, !maxHeight && styles.flex]}>
      <ScrollView
        ref={scroller}
        nestedScrollEnabled
        style={maxHeight ? { maxHeight } : styles.fill}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
      >
        {!loaded && (
          <>
            <Skeleton width="60%" height={38} corner={radius.lg} />
            <Skeleton width="45%" height={38} corner={radius.lg} style={{ alignSelf: "flex-end" }} />
            <Skeleton width="55%" height={38} corner={radius.lg} />
          </>
        )}
        {loaded && messages.length === 0 && pending.length === 0 && <Text style={styles.empty}>No messages yet. Say hello 👋</Text>}
        {messages.map((m) => {
          const mine = m.sender === me;
          return (
            <Animated.View key={m.id} entering={FadeInDown.duration(220)} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={[styles.body, mine && styles.bodyMine]}>{m.body}</Text>
              <Text style={[styles.time, mine && styles.bodyMine]}>
                {new Date(m.created_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </Text>
            </Animated.View>
          );
        })}
        {pending.map((p) => (
          <Pressable
            key={p.key}
            disabled={!p.failed}
            onPress={() => submit(p)}
            style={[styles.bubble, styles.mine, styles.pendingBubble]}
          >
            <Text style={[styles.body, styles.bodyMine]}>{p.body}</Text>
            <Text style={[styles.time, p.failed ? styles.failedText : styles.bodyMine]}>
              {p.failed ? "Not sent · tap to retry" : "Sending…"}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Write a message..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={1000}
        />
        <Pressable
          onPress={() => submit()}
          disabled={!text.trim()}
          accessibilityLabel="Send message"
          style={[styles.sendBtn, !text.trim() && styles.sendOff]}
        >
          <Ionicons name="send" size={18} color={colors.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

// Full-screen wrapper (keyboard-aware) for the standalone thread screens.
export function ChatScreen(props: Parameters<typeof ChatThread>[0]) {
  const { colors } = useTheme();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
      style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}
    >
      <ChatThread {...props} />
    </KeyboardAvoidingView>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  wrap: { gap: spacing.sm },
  flex: { flex: 1 },
  fill: { flexGrow: 1, flexShrink: 1 },
  list: { gap: spacing.sm, paddingVertical: spacing.sm },
  empty: { ...typography.caption, textAlign: "center", paddingVertical: spacing.lg },
  bubble: { maxWidth: "82%", borderRadius: radius.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: 2 },
  mine: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.surfaceMuted, borderBottomLeftRadius: 4 },
  body: { ...typography.body },
  bodyMine: { color: colors.onPrimary },
  time: { fontSize: 11, color: colors.textMuted, alignSelf: "flex-end" },
  pendingBubble: { opacity: 0.65 },
  failedText: { color: colors.danger, fontWeight: "700" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  input: {
    flex: 1,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  sendBtn: { width: 42, height: 42, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  sendOff: { opacity: 0.4 },
});
