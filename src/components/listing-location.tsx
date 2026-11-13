import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet, Linking, ActivityIndicator } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { logListingEvent } from "@/lib/analytics";
import {
  APPROX_RADIUS_M, distanceM, distanceToRoute, fetchRoute, formatDistance, formatDuration,
  type LatLng, type Route, type TravelMode,
} from "@/lib/maps";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { MapView, Marker, Polyline, Circle, type MapRef } from "@/components/map/map";

const ARRIVE_M = 60; // show "I've arrived" within this distance
const OFF_ROUTE_M = 50; // re-route when further than this from the line
const REROUTE_EVERY_MS = 20_000;
const STEP_REACHED_M = 25;

type Props = {
  approx: LatLng | null;
  exact: LatLng | null; // only after a paid unlock has been revealed
  accessMode: "foot" | "car";
  onDirections?: () => void; // omit to hide the button (e.g. the landlord's own view)
};

// "Location" block on the listing page: an approximate circle before unlock, the exact pin after.
export function LocationPreview({ approx, exact, accessMode, onDirections }: Props) {
  const theme = useTheme();
  const { colors, dark } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const center = exact ?? approx;
  if (!center) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Location</Text>
      <View style={styles.previewWrap}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={{ ...center, latitudeDelta: exact ? 0.01 : 0.025, longitudeDelta: exact ? 0.01 : 0.025 }}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          userInterfaceStyle={dark ? "dark" : "light"}
        >
          {exact ? (
            <Marker coordinate={exact}>
              <HomePin color={colors.primary} />
            </Marker>
          ) : (
            <Circle center={center} radius={APPROX_RADIUS_M} strokeColor={colors.primary} strokeWidth={2} fillColor={colors.primary + "33"} />
          )}
        </MapView>
      </View>
      <View style={styles.accessRow}>
        <Ionicons name={accessMode === "car" ? "car-outline" : "walk-outline"} size={16} color={colors.textMuted} />
        <Text style={styles.caption}>
          {accessMode === "car" ? "A motorable road reaches this home." : "The last stretch to this home is on foot."}
          {exact ? "" : " Exact spot shown after unlock."}
          {exact && !onDirections ? " Renters see an approximate area until they unlock." : ""}
        </Text>
      </View>
      {exact && onDirections && (
        <Pressable style={styles.directions} onPress={onDirections} accessibilityRole="button">
          <Ionicons name="navigate" size={18} color={colors.onPrimary} />
          <Text style={styles.directionsText}>Get directions</Text>
        </Pressable>
      )}
    </View>
  );
}

function HomePin({ color }: { color: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: color, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff" }}>
        <Ionicons name="home" size={18} color="#fff" />
      </View>
      <View style={{ width: 3, height: 10, backgroundColor: color, marginTop: -2 }} />
    </View>
  );
}

type NavProps = {
  visible: boolean;
  onClose: () => void;
  destination: LatLng;
  accessMode: "foot" | "car";
  listingId: string;
  deviceId: string;
};

// Turn-by-turn walking/driving guidance inside the listing screen (so the paid reveal is never left).
export function NavigationModal({ visible, onClose, destination, accessMode, listingId, deviceId }: NavProps) {
  const theme = useTheme();
  const { colors, dark } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const mapRef = useRef<MapRef | null>(null);

  const [pos, setPos] = useState<LatLng | null>(null);
  const [denied, setDenied] = useState(false);
  const [mode, setMode] = useState<TravelMode>("foot");
  const [routes, setRoutes] = useState<Partial<Record<TravelMode, Route>>>({});
  const [routeError, setRouteError] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [follow, setFollow] = useState(true);
  const [arrived, setArrived] = useState(false);
  const lastFetch = useRef(0);
  const routeRef = useRef<Route | undefined>(undefined);
  const modes: TravelMode[] = accessMode === "car" ? ["foot", "car"] : ["foot"];

  // live position while the sheet is open
  useEffect(() => {
    if (!visible || arrived) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setDenied(true);
        return;
      }
      setDenied(false);
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 5 }, (l) => {
        if (cancelled) return;
        const p = { latitude: l.coords.latitude, longitude: l.coords.longitude };
        setPos(p);
        // advance past manoeuvres the renter has reached
        setStepIdx((i) => {
          const r = routeRef.current;
          if (!r) return i;
          while (i + 1 < r.steps.length && distanceM(p, r.steps[i + 1].location) < STEP_REACHED_M) i++;
          return i;
        });
      });
      if (cancelled) sub.remove();
    })().catch(() => setDenied(true));
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [visible, arrived]);

  const loadRoutes = useCallback(
    async (from: LatLng) => {
      lastFetch.current = Date.now();
      try {
        const results = await Promise.all(modes.map((m) => fetchRoute(from, destination, m).then((r) => [m, r] as const)));
        setRoutes(Object.fromEntries(results));
        setStepIdx(0);
        setRouteError(false);
      } catch {
        setRouteError(true);
      }
    },
    // modes is derived from accessMode
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [destination.latitude, destination.longitude, accessMode]
  );

  const route = routes[mode];
  const remaining = pos ? distanceM(pos, destination) : null;

  // first route, then re-route when the renter strays from the line
  useEffect(() => {
    if (!pos || arrived) return;
    const stale = Date.now() - lastFetch.current > REROUTE_EVERY_MS;
    if (!route ? lastFetch.current === 0 || stale : stale && distanceToRoute(pos, route.coordinates) > OFF_ROUTE_M) loadRoutes(pos);
  }, [pos, route, arrived, loadRoutes]);

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  // keep the camera on the renter
  useEffect(() => {
    if (pos && follow) mapRef.current?.animateCamera({ center: pos, zoom: 17 }, { duration: 400 });
  }, [pos, follow]);

  const next = route?.steps[stepIdx + 1];

  function arrive() {
    logListingEvent(listingId, deviceId, "arrived");
    setArrived(true);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <View style={styles.navRoot}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={{ ...destination, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
            showsUserLocation
            showsCompass={false}
            userInterfaceStyle={dark ? "dark" : "light"}
            onPanDrag={() => setFollow(false)}
          >
            {route && (
              <>
                <Polyline coordinates={route.coordinates} strokeColor="#ffffff" strokeWidth={11} lineCap="round" lineJoin="round" />
                <Polyline
                  coordinates={route.coordinates}
                  strokeColor={colors.primary}
                  strokeWidth={mode === "foot" ? 7 : 6}
                  lineCap="round"
                  lineJoin="round"
                  lineDashPattern={mode === "foot" ? [1, 12] : undefined}
                />
              </>
            )}
            <Marker coordinate={destination}>
              <HomePin color={colors.primary} />
            </Marker>
          </MapView>

          <SafeAreaView edges={["top"]} pointerEvents="box-none">
            <View style={styles.navTop}>
              <Pressable style={styles.roundBtn} onPress={onClose} accessibilityLabel="Close directions">
                <Ionicons name="close" size={22} color="#171717" />
              </Pressable>
              {!arrived && (
                <View style={styles.instruction}>
                  <Ionicons name="navigate" size={20} color={colors.onPrimary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.instructionText} numberOfLines={2}>
                      {denied ? "Turn on location to start" : !pos ? "Finding your location…" : next ? next.instruction : "Head to the pin"}
                    </Text>
                    {pos && next && <Text style={styles.instructionSub}>in {formatDistance(distanceM(pos, next.location))}</Text>}
                  </View>
                </View>
              )}
            </View>
          </SafeAreaView>

          {!follow && pos && (
            <Pressable style={[styles.roundBtn, styles.recenter]} onPress={() => setFollow(true)} accessibilityLabel="Recenter">
              <Ionicons name="locate" size={22} color="#171717" />
            </Pressable>
          )}

          <SafeAreaView edges={["bottom"]} style={styles.panelWrap}>
            <View style={styles.panel}>
              {arrived ? (
                <View style={styles.arrived}>
                  <Ionicons name="checkmark-circle" size={44} color={colors.success} />
                  <Text style={styles.panelTitle}>You&apos;ve arrived</Text>
                  <Text style={styles.caption}>Enjoy the viewing. The landlord can see that you made it.</Text>
                  <Pressable style={styles.primaryBtn} onPress={onClose}>
                    <Text style={styles.primaryBtnText}>Done</Text>
                  </Pressable>
                </View>
              ) : denied ? (
                <>
                  <Text style={styles.panelTitle}>Location is off</Text>
                  <Text style={styles.caption}>Allow location access so we can guide you from where you are.</Text>
                  <Pressable style={styles.primaryBtn} onPress={() => Linking.openSettings()}>
                    <Text style={styles.primaryBtnText}>Open settings</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.modeRow}>
                    {modes.map((m) => {
                      const r = routes[m];
                      return (
                        <Pressable key={m} style={[styles.modeChip, mode === m && styles.modeChipOn]} onPress={() => {
                          setMode(m);
                          setStepIdx(0);
                        }}>
                          <Ionicons name={m === "car" ? "car" : "walk"} size={18} color={mode === m ? colors.background : colors.text} />
                          <Text style={[styles.modeText, mode === m && styles.modeTextOn]}>
                            {r ? `${formatDuration(r.duration)} · ${formatDistance(r.distance)}` : m === "car" ? "Car" : "Walk"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {accessMode === "foot" && <Text style={styles.caption}>This home is reached on foot. Cars can only get you to the nearest road.</Text>}
                  {routeError && <Text style={[styles.caption, { color: colors.danger }]}>Couldn&apos;t load a route. Follow the pin; we&apos;ll retry as you move.</Text>}
                  {!route && !routeError && pos && <ActivityIndicator color={colors.primary} />}
                  {remaining !== null && (
                    <Text style={styles.remaining}>{formatDistance(remaining)} to go (straight line)</Text>
                  )}
                  {remaining !== null && remaining <= ARRIVE_M && (
                    <Pressable style={styles.primaryBtn} onPress={arrive}>
                      <Ionicons name="flag" size={18} color={colors.onPrimary} />
                      <Text style={styles.primaryBtnText}>I&apos;ve arrived</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

const shadow = { shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 };

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  section: { gap: spacing.sm, marginTop: spacing.sm },
  heading: { ...typography.heading },
  previewWrap: { height: 190, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surfaceMuted },
  accessRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  caption: { ...typography.caption, flexShrink: 1 },
  directions: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: 14, borderRadius: radius.pill, backgroundColor: colors.primary },
  directionsText: { color: colors.onPrimary, fontWeight: "700", fontSize: 16 },

  navRoot: { flex: 1, backgroundColor: colors.background },
  navTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, padding: spacing.lg },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...shadow },
  recenter: { position: "absolute", right: spacing.lg, bottom: 260 },
  instruction: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: 18, backgroundColor: colors.text, ...shadow },
  instructionText: { color: colors.background, fontSize: 17, fontWeight: "700" },
  instructionSub: { color: colors.background, opacity: 0.75, fontSize: 13, marginTop: 2 },
  panelWrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
  panel: { margin: spacing.md, padding: spacing.lg, gap: spacing.md, borderRadius: 24, backgroundColor: colors.background, ...shadow },
  panelTitle: { ...typography.heading },
  modeRow: { flexDirection: "row", gap: spacing.sm },
  modeChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  modeChipOn: { backgroundColor: colors.text, borderColor: colors.text },
  modeText: { fontSize: 13, fontWeight: "700", color: colors.text },
  modeTextOn: { color: colors.background },
  remaining: { ...typography.subheading },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: 14, borderRadius: radius.pill, backgroundColor: colors.primary },
  primaryBtnText: { color: colors.onPrimary, fontWeight: "700", fontSize: 16 },
  arrived: { alignItems: "center", gap: spacing.sm },
});
