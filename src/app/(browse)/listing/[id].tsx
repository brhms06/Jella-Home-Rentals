import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { fetchListing, type PublicListingDetail } from "@/lib/listings";
import { getDeviceId } from "@/lib/device";
import { addRecentId } from "@/lib/recent";
import { logListingEvent } from "@/lib/analytics";
import { ListingDetail } from "@/components/listing-detail";
import { ReportListingForm } from "@/components/report-listing-form";
import { DetailSkeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";

export default function BrowseListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [listing, setListing] = useState<PublicListingDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  useEffect(() => {
    if (deviceId) logListingEvent(id, deviceId, "view");
  }, [id, deviceId]);

  const load = useCallback(() => {
    if (!deviceId) return;
    // A revealed unlock is consumed server-side the instant it's shown, so a
    // background refetch (AppState listener, unlock-poll loop) would otherwise
    // silently re-mask it mid-session — keep the already-revealed data until
    // this screen genuinely remounts (navigate away and back, app relaunch).
    fetchListing(id, deviceId)
      .then((data) => {
        setFailed(false);
        setListing((prev) => (prev?.unlocked && !data.unlocked ? prev : data));
      })
      .catch(() => setFailed(true)); // only shown while nothing has loaded; background refetch failures stay silent
  }, [id, deviceId]);

  useFocusEffect(
    useCallback(() => {
      addRecentId(id);
      load();
    }, [load, id])
  );

  if (!listing || !deviceId) {
    return failed ? (
      <ErrorState
        message="We couldn't load this listing. It may have been removed, or your connection dropped."
        onRetry={() => {
          setFailed(false);
          load();
        }}
        secondary={{ label: "Go back", onPress: () => (router.canGoBack() ? router.back() : router.replace("/(browse)/(tabs)")) }}
      />
    ) : (
      <DetailSkeleton />
    );
  }

  return (
    <ListingDetail
      listing={listing}
      deviceId={deviceId}
      onRefetch={load}
      reportSlot={<ReportListingForm listingId={listing.id} deviceId={deviceId} />}
    />
  );
}
