import { useEffect, useState } from "react";
import { ListingBrowseList } from "@/components/listing-browse-list";
import { getDeviceId } from "@/lib/device";

export default function Browse() {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  if (!deviceId) return null;

  return (
    <ListingBrowseList
      getHref={(id) => ({ pathname: "/(browse)/listing/[id]", params: { id } })}
      deviceId={deviceId}
    />
  );
}
