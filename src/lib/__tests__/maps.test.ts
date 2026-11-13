import { distanceM, distanceToRoute, formatDistance, formatDuration, shortPrice, type LatLng } from "../maps";

const buea: LatLng = { latitude: 4.1527, longitude: 9.241 };

describe("distanceM", () => {
  it("is zero for the same point", () => {
    expect(distanceM(buea, buea)).toBe(0);
  });

  it("matches a known distance (0.01° of latitude is about 1.11 km)", () => {
    const north = { latitude: buea.latitude + 0.01, longitude: buea.longitude };
    expect(distanceM(buea, north)).toBeGreaterThan(1100);
    expect(distanceM(buea, north)).toBeLessThan(1120);
  });

  it("is symmetric", () => {
    const other = { latitude: 4.2, longitude: 9.3 };
    expect(distanceM(buea, other)).toBeCloseTo(distanceM(other, buea), 6);
  });
});

describe("distanceToRoute", () => {
  const line: LatLng[] = [buea, { latitude: 4.1537, longitude: 9.241 }, { latitude: 4.1547, longitude: 9.241 }];

  it("is zero on the route and grows as you leave it", () => {
    expect(distanceToRoute(line[1], line)).toBe(0);
    const off = { latitude: 4.1537, longitude: 9.2425 }; // ~165 m east of the middle vertex
    expect(distanceToRoute(off, line)).toBeGreaterThan(150);
  });
});

describe("formatting", () => {
  it("formats distances", () => {
    expect(formatDistance(42)).toBe("40 m");
    expect(formatDistance(999)).toBe("1000 m");
    expect(formatDistance(1820)).toBe("1.8 km");
  });

  it("formats durations", () => {
    expect(formatDuration(10)).toBe("1 min");
    expect(formatDuration(25 * 60)).toBe("25 min");
    expect(formatDuration(95 * 60)).toBe("1 h 35 min");
  });

  it("shortens prices for map bubbles", () => {
    expect(shortPrice(800)).toBe("800");
    expect(shortPrice(150_000)).toBe("150k");
    expect(shortPrice(1_500_000)).toBe("1.5M");
  });
});
