# Split bounty payouts

Related to upstream issue #12: Multiple PR contributors payout distribution.

## Maintainer flow

After the winning PR locks a bounty, an authorized maintainer may leave the split field blank for the existing single-winner payout or enter 2–50 rows in the form `github-username, USDC amount`.

Split amounts use integer-cent validation and must equal the funded bounty total exactly. Recipient usernames must be unique. Every recipient must have a connected payout destination before any transfer begins.

## Transfer safety

Before the first external transfer, Bountic inserts one `PENDING` payout event per split recipient. A partial unique index applies only to rows whose metadata marks them as split payouts, preventing concurrent/replayed split approvals without changing legacy single-recipient ledger behavior.

Each provider receipt is persisted before the next recipient is paid. The bounty is marked `PAID` only after every recipient transfer succeeds.

## Interrupted payout reconciliation

External provider calls and database writes cannot be made truly atomic. If a process stops after the provider accepted a transfer but before its receipt is persisted, Bountic deliberately refuses automatic replay because doing so could double-pay a contributor.

An operator should reconcile the reserved `payout_events` rows against Locus transaction history. `SUCCESS` rows must never be resent. `PENDING` or `FAILED` rows require confirmation of whether the provider moved funds before any manual recovery. This implementation intentionally favors preventing duplicate payments over automatic retry.

## Deployment

Apply `supabase/migrations/20261006_split_payout_recipient_guard.sql` before enabling split approvals. The index is scoped to split reservation rows and does not impose uniqueness on historical single-recipient payout events.
