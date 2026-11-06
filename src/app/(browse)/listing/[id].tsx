import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { fetchListing, type PublicListingDetail } from "@/lib/listings";
import { getDeviceId } from "@/lib/device";
import { addRecentId } from "@/lib/recent";
import { logListingEvent } from "@/lib/analytics";
import { ListingDetail } from "@/components/listing-detail";
import { ReportListingForm } from "@/components/report-listing-form";

export default function BrowseListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [listing, setListing] = useState<PublicListingDetail | null>(null);

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
    fetchListing(id, deviceId).then((data) =>
      setListing((prev) => (prev?.unlocked && !data.unlocked ? prev : data))
    );
  }, [id, deviceId]);

  useFocusEffect(
    useCallback(() => {
      addRecentId(id);
      load();
    }, [load, id])
  );

  if (!listing || !deviceId) return null;

  return (
    <ListingDetail
      listing={listing}
      deviceId={deviceId}
      onRefetch={load}
      reportSlot={<ReportListingForm listingId={listing.id} deviceId={deviceId} />}
    />
  );
}
