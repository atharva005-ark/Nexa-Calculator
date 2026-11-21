# NEXA Calculator Firestore Security Specification

## 1. Data Invariants
1. **Default-Deny Baseline**: Every unmapped Firestore path is denied for all reads and writes.
2. **Anonymous Feedback Submission Integrity**: Any visitor may create a document under `/feedback/{feedbackId}` ONLY if:
   - `feedbackId` matches `^[a-zA-Z0-9_\-]+$` and is `<= 128` characters.
   - Exact allowed/required keys are present (`type`, `rating`, `category`, `message`, `page`, `deviceType`, `status`, `createdAt`) with zero ghost/shadow fields.
   - `type` is one of `rating | suggestion | bug | general`.
   - `rating` is an integer in `[1, 5]`.
   - `category` (`1..40` chars), `message` (`3..1500` chars), and `page` (`1..64` chars matching `^[a-zA-Z0-9_\-\/]+$`) strictly respect size and pattern constraints.
   - `deviceType` is one of `mobile | tablet | desktop`.
   - `status` is strictly `'new'` on creation (prevents state shortcutting).
   - `createdAt == request.time` (prevents timestamp spoofing).
   - Zero PII fields (no email, phone, IP) are accepted.
3. **Strict Admin Confidentiality & RBAC**:
   - Reading (`get`, `list`), updating (`update`), or deleting (`delete`) `/feedback/{feedbackId}` is strictly restricted to the verified Google administrator account (`request.auth != null && request.auth.token.firebase.sign_in_provider == 'google.com' && request.auth.token.email_verified == true && request.auth.token.email.lower() in ['katharva637@gmail.com']`).
   - Unauthenticated users, non-Google sign-ins, unverified emails, and non-admin signed-in users are denied all read, list, update, and delete operations.
   - Admin triage updates may ONLY mutate `['status', 'updatedAt']`, must pass `isValidFeedbackUpdate()`, must preserve immutable `createdAt`, and must set `updatedAt == request.time`.
4. **Admin Registry Isolation**:
   - `/admins/{adminUid}` cannot be read or written by non-admin users, blocking privilege escalation and self-assigned admin roles.

## 2. The "Dirty Dozen" Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. **Shadow / Ghost Field Injection (Create)**: Creating `/feedback/fb_1` with an extra field `isAdmin: true` or `email: "attacker@evil.com"`.
2. **State Shortcutting (Create)**: Creating `/feedback/fb_2` with `status: "resolved"` instead of `"new"`.
3. **Timestamp Spoofing (Create)**: Creating `/feedback/fb_3` with a client-forged `createdAt` timestamp instead of `request.time`.
4. **Rating Bounds Abuse (Create)**: Creating `/feedback/fb_4` with `rating: 99` or `rating: 4.5` (non-integer).
5. **Resource Exhaustion / Denial of Wallet (Create)**: Creating `/feedback/fb_5` with a `message` of 2,000 characters (`> 1500`).
6. **ID Poisoning (Create)**: Creating `/feedback/` with an invalid or >128 char document ID containing spaces/symbols (`bad id!@#`).
7. **Unauthorized Read (Anonymous Get/List)**: Unauthenticated visitor attempting `get` or `list` on `/feedback`.
8. **Non-Admin Authenticated Read (List Scraping)**: Signed-in user `random@example.com` attempting `list` on `/feedback`.
9. **Email Spoofing Attack (Unverified Email / Non-Google Provider)**: Authenticated user with `email: 'katharva637@gmail.com'` and `email_verified: false` (or non-Google provider) attempting `get`/`list` on `/feedback`.
10. **Immutable Field Tampering (Update)**: Admin attempting to modify `createdAt` or `message` during a triage update.
11. **Value Poisoning on Allowed Key (Update)**: Admin attempting to update `status` to `"hacked"` or a non-string boolean `true`.
12. **Privilege Escalation (Self-Admin Write)**: Regular signed-in user attempting to create `/admins/{theirUid}` with `{ role: "admin" }`.
