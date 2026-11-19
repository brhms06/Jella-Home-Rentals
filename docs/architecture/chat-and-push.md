# Chat and push notifications

> Verified against code at commit `4d56316`. **Built but not yet tested on a real device.** Files: `src/lib/chat.ts`, `src/lib/push.ts`, `src/components/chat-thread.tsx`, `src/app/(browse)/(tabs)/messages.tsx`, `src/app/(browse)/chat/[listingId].tsx`, `src/app/(dashboard)/chat/[id].tsx`, `src/app/(dashboard)/(tabs)/requests.tsx`, migrations 032 and 033.

## Model
- `conversations`: one per (listing, renter device). Holds `renter_name`, `owner_unread`, `renter_unread`, `last_message(+_at)`.
- `messages`: `sender` is `renter|owner`, body 1-1000 chars.
- RLS on, **no policies**; everything goes through security-definer RPCs: `renter_send_message`, `renter_messages`, `renter_conversations` (anon + authenticated) and `owner_conversations`, `owner_messages`, `owner_send_message` (authenticated, ownership checked via `listings.owner_id = auth.uid()`).
- Reading a thread resets that side's unread counter.
- Rules enforced in SQL: the **first** renter message requires a `successful` unlock for that listing/device (so chat does not bypass the paywall); afterwards the thread stays open even though the unlock is consumed. Max 10 renter messages per minute per conversation.

## Renter UX
- After unlocking, the listing page shows the chat inline (replaces the old contact form). The renter's **name is asked once**, saved in AsyncStorage (`jella_renter_name`), and stored on the conversation. "Also on WhatsApp" stays as a secondary button (opens `wa.me` with the owner's number; logs a `contact` event).
- The **Messages tab** lists conversations (needed because a consumed unlock re-locks the listing page). Tap → `/(browse)/chat/[listingId]` (full-screen `ChatScreen`).
- Tab badge: `useRenterUnread()` polls every 20 s and on app foreground.

## Landlord UX
- Inbox tab has a **Messages** filter; rows open `/(dashboard)/chat/[id]` (params `id`, `name`). The Inbox badge (`fetchInboxCount`) includes unread chat messages.

## `ChatThread` behavior
Polls every 4 s while mounted and the app is active (`ponytail:` Realtime is the upgrade; anonymous renters have no RLS identity, so Realtime would need Broadcast or policies). Optimistic bubbles: shown dimmed with "Sending…", on failure kept with "Not sent · tap to retry" (no duplicate on retry because success removes the pending bubble). New messages animate in; first load shows skeleton bubbles.

## Push notifications
- **Tokens**: `push_tokens(token pk, device_id | user_id)` (exactly one set). `registerForPush(deviceId?)` (`push.ts`) asks permission, gets the Expo token (projectId from `app.json` extra.eas), calls `register_push_token`. A token belongs to whoever registered last (landlord account if signed in, else the renter device).
  - Landlords: registered when the dashboard tabs mount (`(dashboard)/(tabs)/_layout.tsx`).
  - Renters: registered after their **first sent message** (permission prompt appears in context).
  - Log out goes through `signOut()` in `push.ts`, which calls `unregister_push_token` first. All four log-out buttons (in `profile-form`, `nav-menu`, `dashboard-sidebar`) use it; do not call `supabase.auth.signOut()` directly.
- **Sending**: trigger `messages_notify` (after insert on `messages`) runs `notify_chat_message()`, which `net.http_post`s Expo's push API (`https://exp.host/--/api/v2/push/send`) via the **pg_net** extension. Renter message → pushes to the landlord's tokens (title "Name · Listing", body first 120 chars, data `{type:'chat', role:'owner', conversationId, name}`); owner reply → pushes to the renter device's tokens (`role:'renter', listingId, title`). Errors are swallowed so a failed push never blocks a message. If Expo "enhanced push security" is enabled, an Authorization header must be added in the function.
- **Tap handling**: `usePushTaps(ready)` (called in root `_layout.tsx` once splash/onboarding are done) opens the right chat, including cold start via `getLastNotificationResponseAsync`.
- **Platform limits**: no push on web (registration is skipped); Android Expo Go cannot receive remote push; iOS Expo Go can. Foreground notifications show a banner (`setNotificationHandler`).
- **Testing plan used**: renter on laptop browser, landlord on phone. Renter → landlord push works; landlord → renter has no push (web) but the open thread refreshes by polling.

## Debugging checklist
1. Is there a row in `push_tokens` for the recipient? (permission denied or app not reloaded → no row.)
2. Did the trigger queue a request? Look in `net.http_request_queue` / `net._http_response`.
3. Expo receipts are not checked, so rejected tokens fail silently (`ponytail:` prune on `DeviceNotRegistered` if needed).

## Not built
Realtime delivery, read receipts, typing indicators, attachments, blocking/reporting a chat, notification settings, badge count on the app icon.
