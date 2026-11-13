// Native maps (Apple Maps on iOS, Google on Android). Works inside Expo Go without an API key.
// map.web.tsx replaces this file on web, where react-native-maps has no implementation.
import MapView, { Marker, Polyline, Circle } from "react-native-maps";

export const MAPS_SUPPORTED = true;
export type MapRef = MapView;
export { MapView, Marker, Polyline, Circle };
