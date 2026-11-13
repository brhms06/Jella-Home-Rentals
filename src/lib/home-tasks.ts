import type { Listing } from "./listings";
import type { Profile } from "./profile";

export type AttentionItem = {
  key: string;
  icon: "mail-outline" | "location-outline" | "shield-checkmark-outline" | "time-outline" | "alert-circle-outline";
  title: string;
  subtitle: string;
  href: string | null; // null = information only
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// What the landlord should do next, most important first (max 4). Pure so it is easy to test.
export function attentionItems(input: {
  inboxCount: number;
  listings: Pick<Listing, "id" | "lat" | "status" | "verification_status">[];
  idStatus: Profile["id_status"] | undefined;
}): AttentionItem[] {
  const { inboxCount, listings, idStatus } = input;
  const items: AttentionItem[] = [];

  if (inboxCount > 0) {
    items.push({
      key: "inbox",
      icon: "mail-outline",
      title: `${plural(inboxCount, "new item", "new items")} in your inbox`,
      subtitle: "Viewing requests and renter activity",
      href: "/(dashboard)/(tabs)/requests",
    });
  }

  const noPin = listings.filter((l) => l.lat == null);
  if (noPin.length > 0) {
    items.push({
      key: "pin",
      icon: "location-outline",
      title: `${plural(noPin.length, "listing has", "listings have")} no map pin`,
      subtitle: "Renters can't get directions without it",
      href: `/(dashboard)/listing/${noPin[0].id}/edit`,
    });
  }

  if (idStatus === "none" || idStatus === "rejected") {
    items.push({
      key: "id",
      icon: "shield-checkmark-outline",
      title: idStatus === "rejected" ? "Your ID was rejected" : "Get your ID verified",
      subtitle: idStatus === "rejected" ? "Upload a clearer photo to earn the badge" : "Verified landlords get a badge and more trust",
      href: "/(dashboard)/(tabs)/profile",
    });
  }

  const pending = listings.filter((l) => l.verification_status === "pending");
  if (pending.length > 0) {
    items.push({
      key: "pending",
      icon: "time-outline",
      title: `${plural(pending.length, "listing is", "listings are")} waiting for review`,
      subtitle: "It goes live once an admin verifies it",
      href: null,
    });
  }

  return items.slice(0, 4);
}

export type ListingFilter = "all" | "live" | "paused" | "pending";

export function filterListings<T extends Pick<Listing, "status" | "verification_status">>(listings: T[], filter: ListingFilter) {
  switch (filter) {
    case "live":
      return listings.filter((l) => l.status === "active" && l.verification_status === "verified");
    case "paused":
      return listings.filter((l) => l.status !== "active");
    case "pending":
      return listings.filter((l) => l.verification_status !== "verified");
    default:
      return listings;
  }
}
