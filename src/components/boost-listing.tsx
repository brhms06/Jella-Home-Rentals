import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { createBoost, isBoosted } from "@/lib/boost";
import { confirmPayment } from "@/lib/biometric";
import { fetchMyListing, type Listing } from "@/lib/listings";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const POLL_MS = 5000;
const POLL_TRIES = 12;

// Landlord: pay by mobile money to feature a listing. The webhook extends boosted_until; we poll for it.
export function BoostListing({ listing, onBoosted }: { listing: Listing; onBoosted: (l: Listing) => void }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const active = isBoosted(listing.boosted_until);
  const digits = phone.replace(/\D/g, "");

  async function boost() {
    if (digits.length < 9) {
      Alert.alert("Enter the mobile money number to charge.");
      return;
    }
    setBusy(true);
    try {
      if (!(await confirmPayment("Confirm boost payment"))) return;
      await createBoost(listing.id, digits);
      setWaiting(true);
      for (let i = 0; i < POLL_TRIES && alive.current; i++) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const fresh = await fetchMyListing(listing.id, listing.owner_id);
        if (fresh.boosted_until !== listing.boosted_until) {
          if (alive.current) onBoosted(fresh);
          break;
        }
      }
    } catch (err) {
      Alert.alert("Couldn't start payment", (err as { message?: string })?.message ?? "Please try again.");
    } finally {
      if (alive.current) {
        setBusy(false);
        setWaiting(false);
      }
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Boost this listing</Text>
      <Text style={styles.meta}>
        {active
          ? `Featured until ${new Date(listing.boosted_until!).toLocaleDateString()}. Boosting again adds 7 more days.`
          : "Appear first in browse with a Featured badge for 7 days (1000 XAF)."}
      </Text>
      <Input placeholder="Mobile money number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      {waiting && <Text style={styles.meta}>Approve the payment on your phone...</Text>}
      <Button label={active ? "Extend boost" : "Boost for 7 days"} loading={busy} loadingLabel="Waiting for payment..." onPress={boost} />
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  card: { gap: spacing.sm, marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  title: { ...typography.subheading },
  meta: { ...typography.caption },
});
