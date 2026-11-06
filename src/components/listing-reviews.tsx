import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fetchReviews, canReview, submitReview, type Review } from "@/lib/reviews";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function Stars({ value, size = 16, onChange }: { value: number; size?: number; onChange?: (n: number) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} disabled={!onChange} onPress={() => onChange?.(n)} hitSlop={4}>
          <Ionicons name={n <= Math.round(value) ? "star" : "star-outline"} size={size} color={colors.primary} />
        </Pressable>
      ))}
    </View>
  );
}

// Rating summary + recent reviews. Renters who paid to unlock the listing can add one review.
// Renders nothing until the reviews migration is applied (fetch fails) or there is nothing to show.
export function ListingReviews({ listingId, deviceId }: { listingId: string; deviceId: string }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [data, setData] = useState<{ reviews: Review[]; average: number; total: number } | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [d, ok] = await Promise.all([fetchReviews(listingId), canReview(listingId, deviceId)]);
      setData(d);
      setAllowed(ok);
    } catch {
      setData(null);
    }
  }, [listingId, deviceId]);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    if (rating === 0) {
      setError("Pick a star rating.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      await submitReview(listingId, deviceId, rating, comment.trim());
      setRating(0);
      setComment("");
      await load();
    } catch {
      setError("Couldn't submit your review.");
    } finally {
      setSending(false);
    }
  }

  if (!data || (data.total === 0 && !allowed)) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.summary}>
        <Text style={styles.heading}>Reviews</Text>
        {data.total > 0 && (
          <>
            <Stars value={data.average} />
            <Text style={styles.meta}>{data.average.toFixed(1)} ({data.total})</Text>
          </>
        )}
      </View>

      {data.reviews.map((r) => (
        <View key={r.id} style={styles.review}>
          <Stars value={r.rating} size={13} />
          {r.comment ? <Text style={styles.comment}>{r.comment}</Text> : null}
          <Text style={styles.meta}>{new Date(r.created_at).toLocaleDateString()}</Text>
        </View>
      ))}

      {allowed && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Rate your experience</Text>
          <Stars value={rating} size={28} onChange={setRating} />
          <Input placeholder="Share a few words (optional)" value={comment} onChangeText={setComment} multiline maxLength={500} />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button label="Submit review" loading={sending} loadingLabel="Sending..." onPress={send} />
        </View>
      )}
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  wrap: { gap: spacing.md, marginTop: spacing.lg },
  summary: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  heading: { ...typography.heading, marginRight: spacing.xs },
  meta: { ...typography.caption },
  review: { gap: 4, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  comment: { ...typography.body },
  form: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  formTitle: { ...typography.subheading },
  error: { color: colors.danger },
});
