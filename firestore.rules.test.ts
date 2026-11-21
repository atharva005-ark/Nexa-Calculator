import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseAdminEmailsList } from './src/lib/admin/adminAuth.ts';

/**
 * Security Rules Contract & "Dirty Dozen" Payload Verification Suite.
 * Validates firestore.rules structural invariants, ADMIN_EMAILS parsing,
 * anonymous feedback submission constraints, and verified Google admin access
 * synced verbatim with firebase-blueprint.json.
 */

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rulesSource = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

interface SimAuth {
  uid: string;
  email?: string;
  email_verified?: boolean;
  sign_in_provider?: string;
}

const AUTHORIZED_ADMIN_EMAILS = ['katharva637@gmail.com'];
const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const VALID_PAGE_REGEX = /^[a-zA-Z0-9_/-]+$/;
const SERVER_TIME = Symbol('request.time');

function simulateCanCreateFeedback(feedbackId: string, data: Record<string, unknown>): boolean {
  if (
    !(
      typeof feedbackId === 'string' &&
      feedbackId.length >= 1 &&
      feedbackId.length <= 128 &&
      VALID_ID_REGEX.test(feedbackId)
    )
  ) {
    return false;
  }
  const requiredKeys = [
    'type',
    'rating',
    'category',
    'message',
    'page',
    'deviceType',
    'status',
    'createdAt',
  ];
  const keys = Object.keys(data);
  if (!requiredKeys.every((k) => keys.includes(k))) return false;
  if (!keys.every((k) => requiredKeys.includes(k))) return false;

  if (!['rating', 'suggestion', 'bug', 'general'].includes(String(data.type))) return false;
  if (
    typeof data.rating !== 'number' ||
    !Number.isInteger(data.rating) ||
    data.rating < 1 ||
    data.rating > 5
  ) {
    return false;
  }
  if (typeof data.category !== 'string' || data.category.length < 1 || data.category.length > 40) {
    return false;
  }
  if (typeof data.message !== 'string' || data.message.length < 3 || data.message.length > 1500) {
    return false;
  }
  if (
    typeof data.page !== 'string' ||
    data.page.length < 1 ||
    data.page.length > 64 ||
    !VALID_PAGE_REGEX.test(data.page)
  ) {
    return false;
  }
  if (!['mobile', 'tablet', 'desktop'].includes(String(data.deviceType))) return false;
  if (data.status !== 'new') return false;
  if (data.createdAt !== SERVER_TIME) return false;
  return true;
}

function simulateIsAuthorizedAdminEmail(auth: SimAuth | null): boolean {
  return Boolean(
    auth &&
      auth.sign_in_provider === 'google.com' &&
      auth.email_verified === true &&
      typeof auth.email === 'string' &&
      AUTHORIZED_ADMIN_EMAILS.includes(auth.email.toLowerCase())
  );
}

function simulateCanUpdateFeedback(
  auth: SimAuth | null,
  feedbackId: string,
  existingData: Record<string, unknown>,
  incomingData: Record<string, unknown>
): boolean {
  if (!simulateIsAuthorizedAdminEmail(auth)) return false;
  if (
    !(
      typeof feedbackId === 'string' &&
      feedbackId.length >= 1 &&
      feedbackId.length <= 128 &&
      VALID_ID_REGEX.test(feedbackId)
    )
  ) {
    return false;
  }
  const allowedKeys = [
    'type',
    'rating',
    'category',
    'message',
    'page',
    'deviceType',
    'status',
    'createdAt',
    'updatedAt',
  ];
  const keys = Object.keys(incomingData);
  if (!allowedKeys.every((k) => keys.includes(k))) return false;
  if (!keys.every((k) => allowedKeys.includes(k))) return false;
  if (!['new', 'reviewed', 'resolved'].includes(String(incomingData.status))) return false;
  if (incomingData.updatedAt !== SERVER_TIME) return false;
  if (incomingData.createdAt !== existingData.createdAt) return false;

  const changedKeys = new Set<string>();
  for (const k of new Set([...Object.keys(existingData), ...Object.keys(incomingData)])) {
    if (existingData[k] !== incomingData[k]) changedKeys.add(k);
  }
  for (const k of changedKeys) {
    if (k !== 'status' && k !== 'updatedAt') return false;
  }
  return true;
}

const VALID_FEEDBACK = {
  type: 'suggestion',
  rating: 5,
  category: 'Scientific',
  message: 'Great scientific calculator layout!',
  page: 'scientific',
  deviceType: 'mobile',
  status: 'new',
  createdAt: SERVER_TIME,
};

test('firestore.rules enforces Eight Pillars & verified Google admin allowlist for katharva637@gmail.com', () => {
  assert.match(rulesSource, /rules_version\s*=\s*'2'/);
  assert.match(rulesSource, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/);
  assert.match(rulesSource, /request\.auth\.token\.firebase\.sign_in_provider == 'google\.com'/);
  assert.match(rulesSource, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesSource, /'katharva637@gmail\.com'/);
  assert.match(rulesSource, /allow list: if isAuthorizedAdminEmail\(\);/);
  assert.match(rulesSource, /allow get: if isValidId\(feedbackId\) && isAuthorizedAdminEmail\(\);/);
  assert.match(rulesSource, /allow delete: if isValidId\(feedbackId\) && isAuthorizedAdminEmail\(\);/);
  assert.match(rulesSource, /isValidFeedbackCreate\(incoming\(\)\)/);
  assert.match(rulesSource, /isValidFeedbackUpdate\(incoming\(\)\)/);
  assert.match(rulesSource, /affectedKeys\(\)\.hasOnly\(\['status', 'updatedAt'\]\)/);
  assert.match(rulesSource, /incoming\(\)\.createdAt == existing\(\)\.createdAt/);
  assert.match(rulesSource, /data\.createdAt == request\.time/);
  assert.match(rulesSource, /data\.updatedAt == request\.time/);

  // Ensure every collection in firebase-blueprint.json has a match block in firestore.rules
  for (const collectionPath of Object.keys(blueprint.firestore)) {
    const baseName = collectionPath.split('/')[1];
    assert.ok(
      rulesSource.includes(`match /${baseName}/`),
      `Missing match block for collection /${baseName}`
    );
  }
});

test('ADMIN_EMAILS parser includes katharva637@gmail.com and handles quotes/delimiters safely', () => {
  const parsed = parseAdminEmailsList(' "AdminOne@Example.com", \'ops@nexa.dev\'; invalid-entry ');
  assert.equal(parsed.has('katharva637@gmail.com'), true);
  assert.equal(parsed.has('adminone@example.com'), true);
  assert.equal(parsed.has('ops@nexa.dev'), true);
  assert.equal(parsed.has('invalid-entry'), false);
});

test('Anonymous feedback submission, verified Google admin access, and Dirty Dozen rejections', () => {
  // Valid anonymous create succeeds
  assert.equal(simulateCanCreateFeedback('fb_valid_001', VALID_FEEDBACK), true);

  // Verified Google admin succeeds (lowercase and mixed-case email claims)
  const verifiedAdmin: SimAuth = {
    uid: 'admin1',
    email: 'katharva637@gmail.com',
    email_verified: true,
    sign_in_provider: 'google.com',
  };
  const mixedCaseAdmin: SimAuth = {
    uid: 'admin1',
    email: 'KAtharva637@Gmail.com',
    email_verified: true,
    sign_in_provider: 'google.com',
  };
  assert.equal(simulateIsAuthorizedAdminEmail(verifiedAdmin), true);
  assert.equal(simulateIsAuthorizedAdminEmail(mixedCaseAdmin), true);

  // 1. Shadow/Ghost field injection
  assert.equal(simulateCanCreateFeedback('fb_1', { ...VALID_FEEDBACK, isAdmin: true }), false);

  // 2. State shortcutting
  assert.equal(simulateCanCreateFeedback('fb_2', { ...VALID_FEEDBACK, status: 'resolved' }), false);

  // 3. Timestamp spoofing
  assert.equal(
    simulateCanCreateFeedback('fb_3', { ...VALID_FEEDBACK, createdAt: '2026-01-01T00:00:00Z' }),
    false
  );

  // 4. Rating bounds / non-integer abuse
  assert.equal(simulateCanCreateFeedback('fb_4a', { ...VALID_FEEDBACK, rating: 99 }), false);
  assert.equal(simulateCanCreateFeedback('fb_4b', { ...VALID_FEEDBACK, rating: 4.5 }), false);

  // 5. Resource exhaustion (> 1500 chars)
  assert.equal(
    simulateCanCreateFeedback('fb_5', { ...VALID_FEEDBACK, message: 'x'.repeat(1501) }),
    false
  );

  // 6. ID poisoning
  assert.equal(simulateCanCreateFeedback('bad id!@#', VALID_FEEDBACK), false);
  assert.equal(simulateCanCreateFeedback('a'.repeat(129), VALID_FEEDBACK), false);

  // 7. Anonymous read/list denied
  assert.equal(simulateIsAuthorizedAdminEmail(null), false);

  // 8. Non-admin authenticated Google user denied (including other emails)
  assert.equal(
    simulateIsAuthorizedAdminEmail({
      uid: 'u1',
      email: 'random@example.com',
      email_verified: true,
      sign_in_provider: 'google.com',
    }),
    false
  );

  // 9. Email spoofing (unverified email or non-Google provider) denied
  assert.equal(
    simulateIsAuthorizedAdminEmail({
      uid: 'u2',
      email: 'katharva637@gmail.com',
      email_verified: false,
      sign_in_provider: 'google.com',
    }),
    false
  );
  assert.equal(
    simulateIsAuthorizedAdminEmail({
      uid: 'u2b',
      email: 'katharva637@gmail.com',
      email_verified: true,
      sign_in_provider: 'password',
    }),
    false
  );

  // 10. Immutable field tampering during update
  assert.equal(
    simulateCanUpdateFeedback(verifiedAdmin, 'fb_valid_001', VALID_FEEDBACK, {
      ...VALID_FEEDBACK,
      message: 'Tampered',
      status: 'reviewed',
      updatedAt: SERVER_TIME,
    }),
    false
  );

  // 11. Value poisoning on allowed key
  assert.equal(
    simulateCanUpdateFeedback(verifiedAdmin, 'fb_valid_001', VALID_FEEDBACK, {
      ...VALID_FEEDBACK,
      status: 'hacked',
      updatedAt: SERVER_TIME,
    }),
    false
  );

  // Valid admin triage update succeeds
  assert.equal(
    simulateCanUpdateFeedback(verifiedAdmin, 'fb_valid_001', VALID_FEEDBACK, {
      ...VALID_FEEDBACK,
      status: 'resolved',
      updatedAt: SERVER_TIME,
    }),
    true
  );

  // 12. Non-admin cannot access /admins registry
  assert.equal(
    simulateIsAuthorizedAdminEmail({
      uid: 'u3',
      email: 'attacker@evil.com',
      email_verified: true,
      sign_in_provider: 'google.com',
    }),
    false
  );
});
