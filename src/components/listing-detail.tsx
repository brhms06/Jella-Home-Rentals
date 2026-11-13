import { useEffect, useRef, useState, type ReactNode, useMemo } from "react";
import { xaf } from "@/lib/listings";
import { View, Text, Image, ScrollView, Pressable, Share, StyleSheet, Linking, AppState, Alert, Platform, Modal, KeyboardAvoidingView, useWindowDimensions } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as ExpoLinking from "expo-linking";
import { router, useNavigation, usePreventRemove } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  preventScreenCaptureAsync,
  allowScreenCaptureAsync,
  addScreenshotListener,
  enableAppSwitcherProtectionAsync,
  disableAppSwitcherProtectionAsync,
} from "expo-screen-capture";
import { createPayment } from "@/lib/payments";
import { logListingEvent } from "@/lib/analytics";
import { RequestViewing } from "@/components/request-viewing";
import { ListingReviews } from "@/components/listing-reviews";
import { consumeListingUnlock, availabilityText, DEFAULT_CITY, type PublicListingDetail } from "@/lib/listings";
import { radius, spacing, cardShadow } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DetailTopBar } from "@/components/detail-top-bar";
import { ListingRow } from "@/components/listing-row";
import { ListingScene, AMENITY_ICONS, amenityLabel, type SceneTile } from "@/components/listing-scene";
import { ReportListingForm } from "@/components/report-listing-form";
import { CompareModal } from "@/components/compare-modal";
import { fetchFavoriteIds, addFavorite, removeFavorite, fetchMyFavoriteListings } from "@/lib/favorites";
import type { PublicListing } from "@/lib/listings";
import { fetchPriceDrops } from "@/lib/price-drops";
import { Neighbourhood } from "@/components/neighbourhood";
import { LocationPreview, NavigationModal } from "@/components/listing-location";

const UNLOCK_PRICE_LABEL = "500 XAF";
const DESKTOP_BREAKPOINT = 900;

function ShareButton({ id, title, color, style }: { id: string; title: string; color: string; style: object }) {
  const onShare = () =>
    Share.share({ message: `${title} on Jella`, url: ExpoLinking.createURL(`/listing/${id}`) }).catch(() => {});
  return (
    <Pressable onPress={onShare} style={style} hitSlop={8} accessibilityLabel="Share listing">
      <Ionicons name="share-outline" size={22} color={color} />
    </Pressable>
  );
}

export function ListingDetail({
  listing,
  deviceId,
  onRefetch,
  reportSlot,
}: {
  listing: PublicListingDetail;
  deviceId: string;
  onRefetch: () => void;
  reportSlot?: ReactNode;
}) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= DESKTOP_BREAKPOINT;

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const navigation = useNavigation();
  const consumedRef = useRef(false);
  const [sheet, setSheet] = useState<"unlock" | "viewing" | "report" | "nav" | null>(null);
  const [saved, setSaved] = useState(false);
  const [compareWith, setCompareWith] = useState<PublicListing[] | null>(null);
  const [oldPrice, setOldPrice] = useState<number | null>(null);

  useEffect(() => {
    fetchPriceDrops([listing.id]).then((m) => setOldPrice(m.get(listing.id)?.previous_price ?? null)).catch(() => {});
  }, [listing.id]);

  useEffect(() => {
    fetchFavoriteIds(deviceId).then((ids) => setSaved(ids.has(listing.id))).catch(() => {});
  }, [deviceId, listing.id]);

  // A paid unlock is single-use: the instant it's revealed, mark it consumed
  // server-side so the paywall returns next time this listing is opened.
  useEffect(() => {
    if (revealed && !consumedRef.current) {
      consumedRef.current = true;
      consumeListingUnlock(listing.id, deviceId).catch(() => {});
    }
  }, [revealed, listing.id, deviceId]);

  usePreventRemove(revealed, ({ data }) => {
    Alert.alert(
      "Leave this listing?",
      "You've already used this unlock. Next time you view this listing you'll need to pay again to see the address and contact details.",
      [
        { text: "Stay", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: () => navigation.dispatch(data.action) },
      ]
    );
  });

  useEffect(() => {
    if (!revealed || Platform.OS === "web") return;
    preventScreenCaptureAsync("listing-detail").catch(() => {});
    enableAppSwitcherProtectionAsync().catch(() => {});
    const sub = addScreenshotListener(() => {
      Alert.alert("Screenshot detected", "Screenshots of this listing's details aren't allowed for the landlord's privacy.");
    });
    return () => {
      allowScreenCaptureAsync("listing-detail").catch(() => {});
      disableAppSwitcherProtectionAsync().catch(() => {});
      sub.remove();
    };
  }, [revealed]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") onRefetch();
    });
    return () => sub.remove();
  }, [onRefetch]);

  // Direct Pay has no redirect page to come back from, so poll a few times
  // right after submitting — the AppState listener above still covers the
  // case where the user backgrounds the app to approve on their phone.
  useEffect(() => {
    if (!awaitingApproval || listing.unlocked) {
      setAwaitingApproval(false);
      return;
    }
    let tries = 0;
    const interval = setInterval(() => {
      tries += 1;
      onRefetch();
      if (tries >= 10) clearInterval(interval);
    }, 3000);
    return () => clearInterval(interval);
  }, [awaitingApproval, listing.unlocked, onRefetch]);

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length >= 9;

  async function handleContact() {
    if (!name.trim()) {
      setContactError("Please enter your name.");
      return;
    }
    setContactError(null);
    setSending(true);
    try {
      if (!listing.owner_whatsapp_number) {
        setContactError("Landlord hasn't added a contact number yet.");
        return;
      }
      const digits = listing.owner_whatsapp_number.replace(/\D/g, "");
      const text = `Hi, I'm ${name} and I'm interested in "${listing.title}". ${message}`;
      const url = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
      logListingEvent(listing.id, deviceId, "contact");
      await Linking.openURL(url);
    } catch {
      setContactError("Couldn't open WhatsApp. Is it installed?");
    } finally {
      setSending(false);
    }
  }

  async function handleUnlock() {
    if (!phoneValid) {
      setUnlockError("Enter a valid mobile money number.");
      return;
    }
    setUnlockError(null);
    setUnlocking(true);
    try {
      await createPayment(listing.id, deviceId, phoneDigits);
      setAwaitingApproval(true);
    } catch {
      setUnlockError("Couldn't start payment. Please try again.");
    } finally {
      setUnlocking(false);
    }
  }

  const actionSection =
    listing.unlocked && !revealed ? (
      <View style={styles.paywall}>
        <Text style={styles.successHeading}>Payment successful</Text>
        <Text style={styles.meta}>You&apos;ve unlocked the exact address and the landlord&apos;s contact number.</Text>
        <View style={styles.noticeBox}>
          <Text style={styles.meta}>
            • This unlock is single-use — once you continue, you won&apos;t be able to view it again for free.{"\n"}
            • Screenshots are disabled on the next screen to protect the landlord&apos;s privacy.{"\n"}
            • Always verify the property and landlord in person before paying any rent or deposit.
          </Text>
        </View>
        <Button label="Continue" onPress={() => setRevealed(true)} style={styles.contactButton} />
      </View>
    ) : listing.unlocked ? (
      <>
        <Text style={styles.contactHeading}>Contact landlord</Text>
        <Input placeholder="Your name" value={name} onChangeText={setName} style={styles.inputSpacing} />
        <Input
          placeholder="Hi, I'm interested in this listing..."
          value={message}
          onChangeText={setMessage}
          multiline
          style={styles.inputSpacing}
        />
        {contactError && <Text style={styles.error}>{contactError}</Text>}
        <Button
          label="Contact via WhatsApp"
          loading={sending}
          loadingLabel="Opening WhatsApp..."
          color={colors.whatsapp}
          onPress={handleContact}
          style={styles.contactButton}
        />
      </>
    ) : (
      <View style={styles.paywall}>
        <Text style={styles.contactHeading}>Exact location & contact</Text>
        <Text style={styles.meta}>Unlock the exact address and the landlord&apos;s phone number for a one-time fee.</Text>
        <Input
          placeholder="Mobile money number, e.g. 677123456"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.inputSpacing}
        />
        {awaitingApproval && <Text style={styles.meta}>Check your phone to approve the payment...</Text>}
        {unlockError && <Text style={styles.error}>{unlockError}</Text>}
        <Button
          label={`Unlock — ${UNLOCK_PRICE_LABEL}`}
          loading={unlocking}
          loadingLabel="Requesting payment..."
          onPress={handleUnlock}
          style={styles.contactButton}
        />
        <Button label="I've paid — check again" variant="text" onPress={onRefetch} style={styles.recheckButton} />
      </View>
    );

  if (isDesktop) {
    const gallery = listing.photos.slice(0, 5);
    const bigPhoto = gallery[0];
    const smallPhotos = gallery.slice(1);

    return (
      <ScrollView>
        <DetailTopBar />
        <View style={styles.desktopPage}>
          {bigPhoto && (
            <View style={styles.desktopGallery}>
              <Image source={{ uri: bigPhoto }} style={styles.desktopGalleryBig} />
              {smallPhotos.length > 0 && (
                <View style={styles.desktopGalleryGrid}>
                  {smallPhotos.map((url) => (
                    <Image key={url} source={{ uri: url }} style={styles.desktopGallerySmall} />
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.desktopLayout}>
            <View style={styles.desktopMain}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { flex: 1 }]}>{listing.title}</Text>
                <ShareButton id={listing.id} title={listing.title} color={colors.text} style={styles.shareBtn} />
              </View>
              {listing.owner_verified && (
        <View style={{ alignSelf: "flex-start" }}>
          <Badge label="Verified landlord" tone="success" />
        </View>
      )}
      <Text style={styles.subtitle}>
                {revealed ? (listing.address ? `${listing.address}, ` : "") : "Exact location available after unlock · "}
                {listing.city}{availabilityText(listing) ? ` · ${availabilityText(listing)}` : ""}
              </Text>
              <Text style={styles.meta}>
                {listing.bedrooms ?? "—"} bed · {listing.bathrooms ?? "—"} bath
              </Text>

              {listing.description && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.description}>{listing.description}</Text>
                </>
              )}

              {listing.amenities.length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.sectionHeading}>What this place offers</Text>
                  <View style={styles.amenityGrid}>
                    {listing.amenities.map((a) => (
                      <View key={a} style={styles.amenityRow}>
                        <Ionicons name={AMENITY_ICONS[a] ?? "checkmark-circle-outline"} size={20} color={colors.text} />
                        <Text style={styles.amenityLabel}>{amenityLabel(a)}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              <Neighbourhood nearby={listing.nearby ?? []} note={listing.neighbourhood_note} />
              <View style={styles.divider} />
              <HostedByBlock listing={listing} />

              <RequestViewing listingId={listing.id} deviceId={deviceId} />
              <ListingReviews listingId={listing.id} deviceId={deviceId} />
              {reportSlot}
            </View>

            <View style={styles.sidebar}>
              {/* ponytail: RN's ViewStyle type doesn't know "sticky" (web-only value) — cast at the one usage site instead of widening the shared style type */}
              <View style={[styles.sidebarCard, { position: "sticky" } as object]}>
                <Text style={styles.sidebarPrice}>
                  {xaf(listing.price)}
                  <Text style={styles.sidebarPriceUnit}>/mo</Text>
                </Text>
                {actionSection}
              </View>
            </View>
          </View>

          <ListingRow
            getHref={(id) => ({ pathname: "/(browse)/listing/[id]", params: { id } })}
            city={listing.city ?? DEFAULT_CITY}
            title={listing.city ? `More homes in ${listing.city}` : `Popular homes in ${DEFAULT_CITY}`}
            excludeId={listing.id}
          />
        </View>
      </ScrollView>
    );
  }

  const availability = availabilityText(listing);
  const location =
    (revealed && listing.address ? `${listing.address}, ` : "") + (listing.city ?? "") || "Location available after unlock";
  const unitLabel = listing.unit_type ? amenityLabel(listing.unit_type) : amenityLabel(listing.property_type);
  const facts = `${listing.bedrooms ?? "—"} ${listing.bedrooms === 1 ? "Bed" : "Beds"} · ${listing.bathrooms ?? "—"} ${listing.bathrooms === 1 ? "Bath" : "Baths"} · ${unitLabel}`;

  async function toggleSaved() {
    const next = !saved;
    setSaved(next);
    try {
      await (next ? addFavorite(deviceId, listing.id) : removeFavorite(deviceId, listing.id));
    } catch {
      setSaved(!next);
    }
  }

  async function openCompare() {
    try {
      const others = (await fetchMyFavoriteListings(deviceId)).filter((l) => l.id !== listing.id).slice(0, 2);
      if (others.length === 0) {
        Alert.alert("Nothing to compare yet", "Save another listing first, then compare it with this one.");
        return;
      }
      setCompareWith([listing as unknown as PublicListing, ...others]);
    } catch {
      Alert.alert("Couldn't load your saved listings.");
    }
  }

  const exact = revealed && listing.lat != null && listing.lng != null ? { latitude: listing.lat, longitude: listing.lng } : null;
  const approx = listing.approx_lat != null && listing.approx_lng != null ? { latitude: listing.approx_lat, longitude: listing.approx_lng } : null;

  function openMap() {
    if (exact) {
      setSheet("nav");
      return;
    }
    if (!revealed || !listing.address) {
      setSheet("unlock");
      return;
    }
    // ponytail: older listings have no pin yet; fall back to an address search in the maps app
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${listing.address}, ${listing.city ?? ""}`)}`).catch(() => {});
  }

  const tiles: SceneTile[] = [
    { icon: "share-social-outline", label: "Share", onPress: () => Share.share({ message: `${listing.title} on Jella`, url: ExpoLinking.createURL(`/listing/${listing.id}`) }).catch(() => {}) },
    { icon: saved ? "heart" : "heart-outline", label: saved ? "Saved" : "Save", onPress: toggleSaved, active: saved },
    { icon: "git-compare-outline", label: "Compare", onPress: openCompare },
    { icon: revealed ? "map-outline" : "lock-closed-outline", label: "Map", onPress: openMap },
    { icon: "flag-outline", label: "Report", onPress: () => setSheet("report") },
  ];

  const primaryLabel = listing.unlocked && revealed ? "WhatsApp" : listing.unlocked ? "Continue" : "Unlock contact";

  return (
    <>
      <ListingScene
        photos={listing.photos}
        title={listing.title}
        price={listing.price}
        facts={facts}
        location={location}
        badges={
          <>
            {oldPrice !== null && <Badge label={`Price dropped from ${xaf(oldPrice)}`} tone="success" />}
            {listing.owner_verified && <Badge label="Verified landlord" tone="success" />}
            {availability && <Badge label={availability} tone="muted" />}
          </>
        }
        tiles={tiles}
        description={listing.description}
        amenities={listing.amenities}
        secondary={{ label: "Request viewing", onPress: () => setSheet("viewing") }}
        primary={{ label: primaryLabel, onPress: () => setSheet("unlock") }}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/(browse)/(tabs)"))}
      >
        <LocationPreview approx={approx} exact={exact} accessMode={listing.access_mode ?? "foot"} onDirections={() => setSheet("nav")} />
        <Neighbourhood nearby={listing.nearby ?? []} note={listing.neighbourhood_note} />
        <HostedByBlock listing={listing} />
        <ListingReviews listingId={listing.id} deviceId={deviceId} />
      </ListingScene>

      {exact && (
        <NavigationModal
          visible={sheet === "nav"}
          onClose={() => setSheet(null)}
          destination={exact}
          accessMode={listing.access_mode ?? "foot"}
          listingId={listing.id}
          deviceId={deviceId}
        />
      )}

      <RequestViewing listingId={listing.id} deviceId={deviceId} visible={sheet === "viewing"} onVisibleChange={(v) => setSheet(v ? "viewing" : null)} />

      <Modal visible={sheet === "unlock" || sheet === "report"} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSheet(null)}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.sheetSafe}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{sheet === "report" ? "Report this listing" : "Contact & location"}</Text>
                <Pressable onPress={() => setSheet(null)} hitSlop={8} accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
                {sheet === "report" ? <ReportListingForm listingId={listing.id} deviceId={deviceId} defaultOpen /> : actionSection}
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>

      {compareWith && <CompareModal listings={compareWith} onClose={() => setCompareWith(null)} />}
    </>
  );
}

function HostedByBlock({ listing }: { listing: PublicListingDetail }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const initial = listing.owner_full_name?.trim()?.[0]?.toUpperCase() ?? "J";
  return (
    <View style={styles.hostRow}>
      <View style={styles.hostAvatar}>
        <Text style={styles.hostAvatarText}>{initial}</Text>
      </View>
      <Text style={styles.hostText}>
        {listing.owner_full_name ? `Hosted by ${listing.owner_full_name}` : "Hosted by the landlord"}
      </Text>
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  photoRow: { marginBottom: spacing.xs },
  photo: { borderRadius: radius.lg, marginRight: spacing.sm, backgroundColor: colors.surfaceMuted },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" },
  priceUnit: { fontSize: 15, fontWeight: "500", color: colors.textMuted },
  locationRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  factRow: { flexDirection: "row", gap: spacing.sm },
  fact: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
  factText: { fontSize: 14, fontWeight: "600", color: colors.text },
  section: { gap: spacing.sm, marginTop: spacing.sm },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  amenityChip: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  amenityChipText: { fontSize: 14, color: colors.text },
  actionCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginTop: spacing.sm, ...cardShadow },
  title: { ...typography.title },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  shareBtn: { padding: spacing.xs },
  price: { fontSize: 26, color: colors.primary, fontWeight: "700" },
  subtitle: { ...typography.caption },
  meta: { color: colors.textMuted },
  description: { lineHeight: 22, ...typography.body },
  contactHeading: { ...typography.heading, marginTop: spacing.sm },
  successHeading: { ...typography.heading, marginTop: spacing.sm, color: colors.success },
  noticeBox: { backgroundColor: colors.successBg, borderRadius: radius.md, padding: spacing.md },
  inputSpacing: { marginTop: spacing.sm },
  error: { color: colors.danger, marginTop: spacing.sm },
  contactButton: { marginTop: spacing.md },
  paywall: { gap: spacing.xs },
  recheckButton: { marginTop: spacing.xs },

  desktopPage: { width: "100%", maxWidth: 1120, alignSelf: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xxl },
  desktopGallery: { flexDirection: "row", gap: spacing.sm, height: 420, borderRadius: radius.lg, overflow: "hidden" },
  desktopGalleryBig: { flex: 2, height: "100%" },
  desktopGalleryGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  desktopGallerySmall: { width: "48.5%", height: "48.5%" },

  desktopLayout: { flexDirection: "row", gap: spacing.xxl },
  desktopMain: { flex: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xl },
  sectionHeading: { ...typography.heading, marginBottom: spacing.md },
  amenityGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  amenityRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, width: "50%" },
  amenityLabel: { ...typography.body },

  sheetSafe: { flex: 1, backgroundColor: colors.background },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg },
  sheetTitle: { ...typography.heading },
  sheetBody: { padding: spacing.lg, gap: spacing.sm },
  hostRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  hostAvatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  hostAvatarText: { color: colors.primary, fontWeight: "700", fontSize: 18 },
  hostText: { ...typography.subheading },

  sidebar: { flex: 1 },
  sidebarCard: {
    top: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  sidebarPrice: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  sidebarPriceUnit: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
});
