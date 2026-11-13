import { attentionItems, filterListings } from "../home-tasks";

const L = (over: Partial<{ id: string; lat: number | null; status: string; verification_status: string }> = {}) => ({
  id: "a",
  lat: 4.15 as number | null,
  status: "active",
  verification_status: "verified",
  ...over,
});

describe("attentionItems", () => {
  it("is empty when everything is in order", () => {
    expect(attentionItems({ inboxCount: 0, listings: [L()], idStatus: "verified" })).toEqual([]);
  });

  it("puts the inbox first and pluralises", () => {
    const [first] = attentionItems({ inboxCount: 1, listings: [], idStatus: "verified" });
    expect(first.key).toBe("inbox");
    expect(first.title).toBe("1 new item in your inbox");
    expect(attentionItems({ inboxCount: 3, listings: [], idStatus: "verified" })[0].title).toBe("3 new items in your inbox");
  });

  it("links the missing-pin task to the first affected listing", () => {
    const items = attentionItems({ inboxCount: 0, listings: [L({ id: "x", lat: null }), L({ id: "y", lat: null })], idStatus: "verified" });
    expect(items[0].key).toBe("pin");
    expect(items[0].title).toBe("2 listings have no map pin");
    expect(items[0].href).toBe("/(dashboard)/listing/x/edit");
  });

  it("asks for ID only when it is missing or rejected, not while pending or verified", () => {
    const keys = (idStatus: "none" | "pending" | "verified" | "rejected") =>
      attentionItems({ inboxCount: 0, listings: [], idStatus }).map((i) => i.key);
    expect(keys("none")).toEqual(["id"]);
    expect(keys("rejected")).toEqual(["id"]);
    expect(keys("pending")).toEqual([]);
    expect(keys("verified")).toEqual([]);
  });

  it("flags listings awaiting review as information only", () => {
    const [item] = attentionItems({ inboxCount: 0, listings: [L({ verification_status: "pending" })], idStatus: "verified" });
    expect(item.key).toBe("pending");
    expect(item.href).toBeNull();
  });

  it("shows at most four items", () => {
    const items = attentionItems({
      inboxCount: 2,
      listings: [L({ lat: null }), L({ verification_status: "pending" })],
      idStatus: "none",
    });
    expect(items).toHaveLength(4);
    expect(items.map((i) => i.key)).toEqual(["inbox", "pin", "id", "pending"]);
  });
});

describe("filterListings", () => {
  const all = [
    L({ id: "live" }),
    L({ id: "paused", status: "paused" }),
    L({ id: "pending", verification_status: "pending" }),
    L({ id: "rejected", verification_status: "rejected" }),
  ];
  const ids = (f: Parameters<typeof filterListings>[1]) => filterListings(all, f).map((l) => l.id);

  it("filters by state", () => {
    expect(ids("all")).toHaveLength(4);
    expect(ids("live")).toEqual(["live"]);
    expect(ids("paused")).toEqual(["paused"]);
    expect(ids("pending")).toEqual(["pending", "rejected"]);
  });
});
