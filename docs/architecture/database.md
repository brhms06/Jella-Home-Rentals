# Database, storage and edge functions

> Verified against the migration files and the deployed edge-function list at commit `4d56316`. The live project is Supabase ref `niqewfrpyfbckguchdln`. For exact current definitions query the DB (`pg_proc`, `pg_policies`) rather than trusting this summary; the migration files show history and intent (later migrations supersede earlier function definitions).

## Migrations
`supabase/migration.sql` then `migration_002` … `migration_033`, run in order. Notable supersessions: `public_listing(s)` are redefined many times as columns were added (most recently in 031, which is the current definition); roles were reworked in 003/008/013; bookings, realtor role and leasing were removed in 008. New work: add the next number, keep the "run after" header.

## Tables (current)
| Table | Purpose | Access |
|---|---|---|
| `profiles` | one per auth user: name, WhatsApp, avatar, country, `role`, `suspended`, `id_status`, `id_document_path` | RLS: own row; superadmin all |
| `listings` | the properties (see `listings-and-unlocks.md`) | RLS for owners/superadmin; renters via `public_listing(s)` |
| `listing_unlocks` | one row per (listing, device): `status`, `fapshi_trans_id`, `amount`, `consumed` | default-deny; edge functions (service role) + RPCs |
| `listing_boosts` | landlord boost payments | default-deny; edge function + `apply_boost_status` |
| `listing_events` | anonymous `view|contact|arrived` events | default-deny; `log_listing_event`, `owner_*` readers |
| `favorites` | device favorites | **open anon policies** (select/insert/delete using true, migration 010) |
| `reports` | renter reports of listings | open anon insert; superadmin read/update |
| `reviews` | ratings from devices that paid | RPCs (`submit_review`, `listing_reviews`, `listing_review_summary`, `can_review_listing`) |
| `viewing_requests` | renter-proposed viewing slots | default-deny; RPCs |
| `moderation_log` | admin action history | trigger-written; superadmin read |
| `conversations`, `messages` | chat | default-deny; RPCs |
| `push_tokens` | Expo push tokens (device or user) | default-deny; RPCs |
| `private_settings` | secrets in the DB (e.g. `geo_salt`) | not client-readable |

## Function groups
- **Renter-facing (anon + authenticated, take `p_device_id`)**: `public_listings`, `public_listing`, `consume_listing_unlock`, `log_listing_event`, `create_viewing_request`, `my_viewing_requests`, `cancel_viewing_request`, `submit_review`, `can_review_listing`, `listing_reviews`, `listing_review_summary`, `price_drops`, `renter_send_message`, `renter_messages`, `renter_conversations`, `register_push_token`.
- **Landlord (authenticated, scoped by `auth.uid()`)**: `owner_listing_stats`, `owner_views_by_day`, `owner_contact_events`, `owner_viewing_requests`, `respond_viewing_request`, `owner_conversations`, `owner_messages`, `owner_send_message`, `submit_id_verification`, `unregister_push_token`.
- **Admin (superadmin)**: `admin_revenue_stats`, `admin_boost_stats`, `admin_top_listings`, `admin_moderation_log`, `is_superadmin`.
- **Internal/triggers**: `handle_new_user` (profile on signup), `set_updated_at`, `protect_boosted_until`, `track_price_drop`, `log_moderation`, `protect_id_verification`, `fuzz_offset` (execute revoked), `apply_boost_status` (called by the webhook), `notify_chat_message`.

## Triggers worth knowing
`listings_protect_boosted_until` (blocks direct `boosted_until` writes), `listings_track_price_drop`, `listings_log_moderation`, `listings_set_updated_at`, `profiles_protect_id_verification`, `messages_notify` (push), and on `auth.users` the profile-creation trigger.

## Storage buckets
`listing-photos` (public; owners upload/delete their own), `avatar-photos` (public), `id-documents` (**private**; landlord uploads under their own user-id folder, admin reads through a 5-minute signed URL).

## Extensions
`pg_net` (installed by migration 033) is used by the chat push trigger. `pg_cron` is available but unused.

## Edge functions (`supabase/functions`, Deno)
| Function | `verify_jwt` | Purpose |
|---|---|---|
| `create-payment` | true | create/reset an unlock and call Fapshi direct-pay (500 XAF) |
| `create-boost` | true | landlord boost payment (1000 XAF, 7 days); checks listing ownership |
| `fapshi-webhook` | **false** | Fapshi callback; guarded by header `x-wh-secret` == `FAPSHI_WEBHOOK_SECRET`; updates unlock/boost status |
| `maps` | true | routing + reverse geocoding proxy |

Secrets (Supabase dashboard, not in repo): `FAPSHI_API_USER`, `FAPSHI_API_KEY`, `FAPSHI_WEBHOOK_SECRET`. Functions use the service-role key from the built-in env. Deploy via the Supabase MCP `deploy_edge_function` or the CLI; keep the repo copy and the deployed version in sync (check `list_edge_functions` versions).

## Seeding / test data
`supabase/seed_demo_listings.sql` inserts 8 demo listings (ids `00000000-0000-4000-8000-00000000000N`, owned by the first landlord account) with picsum placeholder photos; two get real price drops by two price edits. Remove with `delete from listings where id::text like '00000000-0000-4000-8000-0000000000%';`. Boosts cannot be seeded (trigger); boost from the app.

## Testing SQL safely
Wrap a test in a `DO` block that ends with `raise exception 'ROLLBACK-OK …'` to see results while rolling everything back (used to test the chat functions and the push trigger; `net.http_request_queue` shows queued pushes without sending them).
