import { timeAgo } from "../inbox";
import { xaf } from "../listings";

describe("xaf", () => {
  it("formats francs with thousands separators", () => {
    expect(xaf(150000)).toBe("150,000 XAF");
    expect(xaf("60000")).toBe("60,000 XAF");
    expect(xaf(0)).toBe("0 XAF");
  });
});

describe("timeAgo", () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  it("reads naturally at each scale", () => {
    expect(timeAgo(ago(10_000))).toBe("just now");
    expect(timeAgo(ago(5 * 60_000))).toBe("5m ago");
    expect(timeAgo(ago(3 * 3_600_000))).toBe("3h ago");
    expect(timeAgo(ago(2 * 86_400_000))).toBe("2d ago");
  });

  it("never shows a negative time for a slightly-future timestamp", () => {
    expect(timeAgo(new Date(Date.now() + 60_000).toISOString())).toBe("just now");
  });
});
