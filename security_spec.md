# Security Specification: Ledgerline Budget Tracker

## 1. Data Invariants
1. **Strict Ownership**: Every `UserProfile`, `Category`, and `Transaction` document belongs to a single verified `request.auth.uid`, and no user can read, list, create, update, or delete another user's records.
2. **Email Verification Gate**: All authenticated read/write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Referential Integrity**: A `Category` cannot be created unless its parent `/users/{userId}` document exists (or is created in the same atomic batch via `existsAfter`). A `Transaction` cannot be created unless its referenced `categoryId` exists (or is created in the same atomic batch via `existsAfter`) under `/users/{userId}/categories/{categoryId}`.
4. **Immutable Lineage & Temporal Integrity**: `userId`, `id`, and `createdAt` are immutable after creation; `createdAt` must equal `request.time` on creation, and `updatedAt` must equal `request.time` on creation and every update.
5. **Strict Schema & Bounds**: Unknown shadow fields are rejected (`keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` on update). All string fields have explicit `.size()` bounds, numbers are bounded (`amount > 0 && amount <= 10000000`, `monthlyLimit >= 0 && monthlyLimit <= 10000000`), and document IDs match `^[a-zA-Z0-9_\\-]+$`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Write**: Create `/users/userA/transactions/tx1` with `request.auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Create `/users/userA/categories/cat1` with `request.auth.uid == 'userA'` and `email_verified == false` -> `PERMISSION_DENIED`.
3. **Cross-User Read/List**: List `/users/userB/transactions` while authenticated as `userA` -> `PERMISSION_DENIED`.
4. **Identity Spoofing on Create**: Create `/users/userA/transactions/tx1` with `userId: 'userB'` -> `PERMISSION_DENIED`.
5. **Shadow Field Injection**: Create `/users/userA/categories/cat1` including extra field `isAdmin: true` -> `PERMISSION_DENIED`.
6. **ID Poisoning**: Create `/users/userA/categories/bad$id/..` or a 300-char ID -> `PERMISSION_DENIED`.
7. **Orphaned Transaction**: Create `/users/userA/transactions/tx1` referencing non-existent `categoryId: 'ghost_cat'` -> `PERMISSION_DENIED`.
8. **Negative / Zero Transaction Amount**: Create `/users/userA/transactions/tx1` with `amount: -50` or `amount: 0` -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Create or update a document with `createdAt` or `updatedAt` set to a client-supplied timestamp rather than `request.time` -> `PERMISSION_DENIED`.
10. **Immutable Field Mutation**: Update `/users/userA/transactions/tx1` attempting to alter `createdAt`, `id`, or `userId` -> `PERMISSION_DENIED`.
11. **Value Poisoning on Update**: Update `monthlyLimit` to `"unlimited"` (wrong type) or `merchant` to a 500-char string -> `PERMISSION_DENIED`.
12. **Blanket List Abuse**: Query `/users/{userId}/transactions` where `resource.data.userId != request.auth.uid` -> `PERMISSION_DENIED`.
