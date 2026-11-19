# UI system and screen patterns

> Verified against code at commit `4d56316`. Files: `src/constants/theme.ts`, `src/lib/theme-context.tsx`, `src/components/ui/*`, `src/hooks/use-desktop.ts`.

## Theme
`useTheme()` returns `{ dark, colors, typography }`. Palette (orange primary `#F25623`, near-black text, light gray surfaces) has a light and a dark set; mode is `system|light|dark` (`useThemeMode`), re-read when the app foregrounds. `colors.onPrimary` is dark text on orange. Spacing (`xs 4 … xxl 32`), `radius` (`sm 8 … pill 999`), `cardShadow`, and `typography` (`title|heading|subheading|body|caption`) are in `theme.ts`.

Pattern for every component:
```tsx
const theme = useTheme();
const styles = useMemo(() => makeStyles(theme), [theme]);
const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({ ... });
```

## Shared primitives (`src/components/ui`)
`Button` (variants `primary|outline|text`, `loading`/`loadingLabel`, `color`), `Input` (label, `rightSlot`), `Badge` (`success|muted`), `Avatar`, `StatCard`, `EmptyState`, **`ErrorState`** (message + "Try again" + optional secondary action), **`Skeleton` family** (`Skeleton`, `ListingCardSkeleton`, `SkeletonList`, `RowSkeletonList`, `DetailSkeleton`), `PressableScale` (shrinks while held; used by `Button`), `Reveal` (fade-in with stagger delay), `AnimatedHeart`, `TabIcon` (hops when active), `FloatingTabBar` (frosted pill; the active tab expands into a colored chip with its label; `TAB_BAR_SPACE = 104` is the bottom padding lists must reserve), `SortControl`, `CountrySelect`, `ThemeToggle`.

## Loading / error / empty pattern (added after the chat work)
Every data screen should show, in this order: **skeleton while loading with nothing to show → `ErrorState` with retry if the fetch failed and there is nothing to show → `EmptyState` if truly empty.** Background refetches that fail while data is already displayed stay silent. Screens that hide their header (both listing detail routes) pass a "Go back" `secondary` action to `ErrorState` so the user is never stuck. Root-level: `+not-found.tsx` and an exported `ErrorBoundary` in `app/_layout.tsx` (renders outside providers; `useTheme` has a default light theme for that reason).
Retry is typically a `retryKey` state in the effect's deps, or re-calling the loader.

## Haptics and micro-interactions
`src/lib/haptics.ts` exports `tap()` / `success()` (no-ops on web). Used on tab switches, favoriting (only on the toggle, not when already-saved cards mount) and sending a chat message. Reanimated is used for entering animations (`FadeIn`, `FadeInDown`), springs and the collapsing search pill on Explore.

## Desktop web
`DESKTOP_BREAKPOINT = 900` (`theme.ts`, `use-desktop.ts`). Above it on web: top bars/sidebar instead of the floating tab bar; Explore renders a plain wrapped grid inside an `Animated.ScrollView` (a FlatList `numColumns` remount caused a scroll freeze, see the `ponytail:` note in `listing-browse-list.tsx`); dashboard gets `DashboardSidebar`. The new chat/messages/skeleton screens were only designed for mobile widths.

## Screens worth knowing
- `listing-detail.tsx` is the big one (renter detail, mobile + desktop layouts): gallery, price drop, verified badge, neighbourhood, reviews, location block, unlock paywall, post-unlock chat, report, compare, share. `ListingDetail` receives `listing`, `deviceId`, `onRefetch`, `reportSlot`.
- Explore (`(browse)/(tabs)/index.tsx` → `listing-browse-list.tsx`): `HomeFeed` (Discover entry, recently viewed, city/category rows) when no filters; otherwise the filtered list. Header pill collapses on scroll.
- Landlord Home (`(dashboard)/(tabs)/index.tsx`): attention tasks (`home-tasks.ts`, unit-tested), stats, listings with filters.

## Tests
`npx jest` runs `src/lib/__tests__` (format, home-tasks, maps, saved-searches, swipes). No component or chat/push tests yet.
