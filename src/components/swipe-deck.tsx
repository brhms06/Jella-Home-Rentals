import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { xaf } from "@/lib/listings";
import { View, Text, Image, Pressable, Animated, PanResponder, StyleSheet, ActivityIndicator, useWindowDimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchListings, type PublicListing } from "@/lib/listings";
import { fetchFavoriteIds, addFavorite, removeFavorite } from "@/lib/favorites";
import { getDeviceId } from "@/lib/device";
import { getSkipped, markSkipped, unmarkSkipped, isStillHidden } from "@/lib/swipes";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { EmptyState } from "@/components/ui/empty-state";

const HINT_KEY = "discover_hint_seen";

type Action = { listing: PublicListing; dir: "left" | "right" };

// Tinder-style discovery: swipe right to save (favorites), left to skip. Tap a card to open the listing.
export function SwipeDeck() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [queue, setQueue] = useState<PublicListing[] | null>(null);
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<Action[]>([]);
  const pan = useRef(new Animated.ValueXY()).current;
  const busy = useRef(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(HINT_KEY).then((v) => setHint(v !== "1")).catch(() => {});
  }, []);

  function dismissHint() {
    setHint(false);
    AsyncStorage.setItem(HINT_KEY, "1").catch(() => {});
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = await getDeviceId();
      const [all, favs, skipped] = await Promise.all([
        fetchListings({ sort: "newest" }),
        fetchFavoriteIds(id).catch(() => new Set<string>()),
        getSkipped(),
      ]);
      if (cancelled) return;
      setDeviceId(id);
      setQueue(all.filter((l) => l.photos[0] && !favs.has(l.id) && !isStillHidden(skipped[l.id], l.is_boosted)));
    })().catch(() => !cancelled && setQueue([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const current = queue?.[index];
  const next = queue?.[index + 1];

  const commit = useCallback(
    (dir: "left" | "right") => {
      const listing = queue?.[index];
      if (!listing || !deviceId) return;
      if (dir === "right") addFavorite(deviceId, listing.id).catch(() => {});
      else markSkipped(listing.id);
      setHistory((h) => [...h, { listing, dir }]);
      dismissHint();
      pan.setValue({ x: 0, y: 0 });
      setIndex((i) => i + 1);
      busy.current = false;
    },
    [queue, index, deviceId, pan]
  );

  const fling = useCallback(
    (dir: "left" | "right") => {
      if (busy.current) return;
      busy.current = true;
      Animated.timing(pan, { toValue: { x: (dir === "right" ? 1 : -1) * width * 1.3, y: 0 }, duration: 220, useNativeDriver: false }).start(() => commit(dir));
    },
    [pan, width, commit]
  );

  function undo() {
    const last = history[history.length - 1];
    if (!last || !deviceId || busy.current) return;
    if (last.dir === "right") removeFavorite(deviceId, last.listing.id).catch(() => {});
    else unmarkSkipped(last.listing.id);
    setHistory((h) => h.slice(0, -1));
    setIndex((i) => i - 1);
  }

  // PanResponder is created once; route through a ref so it always sees the latest handlers.
  const flingRef = useRef(fling);
  flingRef.current = fling;
  const threshold = width * 0.28;
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, g) => {
          if (g.dx > threshold || g.vx > 0.8) flingRef.current("right");
          else if (g.dx < -threshold || g.vx < -0.8) flingRef.current("left");
          else Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 7 }).start();
        },
      }),
    [pan, threshold]
  );

  const rotate = pan.x.interpolate({ inputRange: [-width, 0, width], outputRange: ["-12deg", "0deg", "12deg"] });
  const saveOpacity = pan.x.interpolate({ inputRange: [0, threshold], outputRange: [0, 1], extrapolate: "clamp" });
  const skipOpacity = pan.x.interpolate({ inputRange: [-threshold, 0], outputRange: [1, 0], extrapolate: "clamp" });
  const nextScale = pan.x.interpolate({ inputRange: [-width, 0, width], outputRange: [1, 0.94, 1], extrapolate: "clamp" });

  const cardW = Math.min(width - spacing.lg * 2, 460);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(browse)/(tabs)"))} style={styles.iconBtn} accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Discover</Text>
        <View style={styles.iconBtn} />
      </View>

      {queue === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !current ? (
        <View style={styles.center}>
          <EmptyState icon="checkmark-done-outline" message="You're all caught up. New homes will show up here." />
          {history.length > 0 && (
            <Pressable onPress={undo} style={styles.linkBtn}>
              <Text style={styles.linkText}>Undo last swipe</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <>
          <View style={[styles.deck, { width: cardW }]}>
            {next && (
              <Animated.View style={[styles.card, styles.behind, { transform: [{ scale: nextScale }] }]}>
                <Image source={{ uri: next.photos[0] }} style={StyleSheet.absoluteFill} />
              </Animated.View>
            )}
            <Animated.View
              key={current.id}
              style={[styles.card, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }]}
              {...responder.panHandlers}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={() => router.push({ pathname: "/(browse)/listing/[id]", params: { id: current.id } })}>
                <Image source={{ uri: current.photos[0] }} style={StyleSheet.absoluteFill} />
                <LinearGradient colors={["transparent", "rgba(0,0,0,0.78)"]} style={styles.scrim} />
                <View style={styles.chips}>
                  {current.is_boosted && <Text style={styles.chip}>Featured</Text>}
                  {current.owner_verified && <Text style={styles.chip}>Verified landlord</Text>}
                </View>
                <View style={styles.info}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{current.title}</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {current.city ?? "—"} · {current.bedrooms ?? "—"} bed · {current.bathrooms ?? "—"} bath
                    </Text>
                    <Text style={styles.cardPrice}>
                      {xaf(current.price)}
                      <Text style={styles.cardPriceUnit}>/month</Text>
                    </Text>
                  </View>
                </View>
              </Pressable>
              <Animated.View style={[styles.stamp, styles.stampSave, { opacity: saveOpacity }]} pointerEvents="none">
                <Text style={[styles.stampText, { color: colors.success }]}>SAVE</Text>
              </Animated.View>
              <Animated.View style={[styles.stamp, styles.stampSkip, { opacity: skipOpacity }]} pointerEvents="none">
                <Text style={[styles.stampText, { color: colors.danger }]}>SKIP</Text>
              </Animated.View>
            </Animated.View>
          </View>

          {hint && (
            <Pressable style={styles.hint} onPress={dismissHint}>
              <Ionicons name="arrow-back" size={16} color={colors.danger} />
              <Text style={styles.hintText}>Swipe left to skip</Text>
              <Text style={styles.hintDot}>·</Text>
              <Text style={styles.hintText}>right to save</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.success} />
            </Pressable>
          )}

          <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Pressable style={[styles.roundBtn, styles.roundBtnLg]} onPress={() => fling("left")} accessibilityLabel="Skip">
              <Ionicons name="close" size={30} color={colors.danger} />
            </Pressable>
            <Pressable style={[styles.roundBtn, history.length === 0 && styles.roundBtnOff]} onPress={undo} disabled={history.length === 0} accessibilityLabel="Undo">
              <Ionicons name="arrow-undo" size={20} color={colors.textMuted} />
            </Pressable>
            <Pressable style={[styles.roundBtn, styles.roundBtnLg]} onPress={() => fling("right")} accessibilityLabel="Save">
              <Ionicons name="heart" size={28} color={colors.primary} />
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, alignItems: "center" },
  header: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  title: { ...typography.heading },
  center: { flex: 1, alignItems: "center", justifyContent: "center", alignSelf: "stretch" },
  linkBtn: { marginTop: spacing.lg },
  linkText: { color: colors.primary, fontWeight: "600", fontSize: 15 },
  deck: { flex: 1, marginTop: spacing.md },
  card: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderRadius: 28, overflow: "hidden", backgroundColor: colors.surfaceMuted },
  behind: { top: 10, bottom: -6, left: 6, right: 6, opacity: 0.9 },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "45%" },
  chips: { position: "absolute", top: spacing.lg, left: spacing.lg, flexDirection: "row", gap: spacing.sm },
  chip: { overflow: "hidden", paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.85)", color: "#171717", fontSize: 12, fontWeight: "700" },
  info: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg, gap: 6 },
  infoRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: spacing.md },
  cardTitle: { color: "#fff", fontSize: 24, fontWeight: "700" },
  cardMeta: { color: "rgba(255,255,255,0.8)", fontSize: 14, flex: 1 },
  cardPrice: { color: "#fff", fontSize: 20, fontWeight: "700" },
  cardPriceUnit: { fontSize: 13, fontWeight: "500", color: "rgba(255,255,255,0.75)" },
  stamp: { position: "absolute", top: 48, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 3, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.85)" },
  stampSave: { left: 24, transform: [{ rotate: "-14deg" }], borderColor: colors.success },
  stampSkip: { right: 24, transform: [{ rotate: "14deg" }], borderColor: colors.danger },
  stampText: { fontSize: 26, fontWeight: "800", letterSpacing: 2 },
  hint: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.md, paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
  hintText: { fontSize: 13, fontWeight: "600", color: colors.text },
  hintDot: { color: colors.textMuted },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xl, paddingTop: spacing.lg },
  roundBtn: { width: 52, height: 52, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  roundBtnLg: { width: 68, height: 68 },
  roundBtnOff: { opacity: 0.4 },
});
