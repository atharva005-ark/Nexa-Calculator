import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './client';

export type FeedbackType = 'rating' | 'suggestion' | 'bug' | 'general';
export type FeedbackStatus = 'new' | 'reviewed' | 'resolved';
export type FeedbackDeviceType = 'mobile' | 'tablet' | 'desktop';

export interface FeedbackRecord {
  id: string;
  type: FeedbackType;
  rating: number;
  category: string;
  message: string;
  page: string;
  deviceType: FeedbackDeviceType;
  status: FeedbackStatus;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SubmitFeedbackInput {
  type: FeedbackType;
  rating: number;
  category: string;
  message: string;
  page: string;
}

// Blueprint constants synced verbatim with firebase-blueprint.json & firestore.rules
export const FEEDBACK_LIMITS = {
  CATEGORY_MIN: 1,
  CATEGORY_MAX: 40,
  MESSAGE_MIN: 3,
  MESSAGE_MAX: 1500,
  PAGE_MIN: 1,
  PAGE_MAX: 64,
  PAGE_PATTERN: /^[a-zA-Z0-9_\-/]+$/,
  RATING_MIN: 1,
  RATING_MAX: 5,
} as const;

export function detectDeviceType(): FeedbackDeviceType {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function generateFeedbackId(): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
      ? Array.from(crypto.getRandomValues(new Uint8Array(6)))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
      : Math.random().toString(36).slice(2, 10);
  return `fb_${Date.now()}_${rand}`;
}

export async function submitAnonymousFeedback(input: SubmitFeedbackInput): Promise<string> {
  const validTypes: FeedbackType[] = ['rating', 'suggestion', 'bug', 'general'];
  const type: FeedbackType = validTypes.includes(input.type) ? input.type : 'general';

  const rating = Math.round(Number(input.rating));
  if (
    !Number.isInteger(rating) ||
    rating < FEEDBACK_LIMITS.RATING_MIN ||
    rating > FEEDBACK_LIMITS.RATING_MAX
  ) {
    throw new Error('Please choose a rating between 1 and 5 stars.');
  }

  const category = input.category.trim().slice(0, FEEDBACK_LIMITS.CATEGORY_MAX) || 'General';
  const message = input.message.trim().slice(0, FEEDBACK_LIMITS.MESSAGE_MAX);
  if (message.length < FEEDBACK_LIMITS.MESSAGE_MIN) {
    throw new Error(`Please write at least ${FEEDBACK_LIMITS.MESSAGE_MIN} characters of feedback.`);
  }

  const rawPage = input.page.trim().slice(0, FEEDBACK_LIMITS.PAGE_MAX);
  const page = FEEDBACK_LIMITS.PAGE_PATTERN.test(rawPage) ? rawPage : 'home';
  const deviceType = detectDeviceType();

  const feedbackId = generateFeedbackId();
  const path = `feedback/${feedbackId}`;

  try {
    await setDoc(doc(db, 'feedback', feedbackId), {
      type,
      rating,
      category,
      message,
      page,
      deviceType,
      status: 'new',
      createdAt: serverTimestamp(),
    });
    return feedbackId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

function toDateOrNull(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

export interface ParsedFeedbackError {
  message: string;
  isPermissionDenied: boolean;
  operationType?: string;
  path?: string | null;
  email?: string | null;
}

export function parseFeedbackError(rawMessage: string): ParsedFeedbackError {
  try {
    const parsed = JSON.parse(rawMessage) as {
      error?: string;
      operationType?: string;
      path?: string | null;
      authInfo?: { email?: string | null };
    };
    const errText = parsed.error || rawMessage;
    const isPermissionDenied = /missing or insufficient permissions|permission-denied/i.test(errText);
    return {
      message: errText,
      isPermissionDenied,
      operationType: parsed.operationType,
      path: parsed.path ?? null,
      email: parsed.authInfo?.email ?? null,
    };
  } catch {
    return {
      message: rawMessage,
      isPermissionDenied: /missing or insufficient permissions|permission-denied/i.test(rawMessage),
    };
  }
}

export function subscribeToAdminFeedback(
  onData: (items: FeedbackRecord[]) => void,
  onError: (error: ParsedFeedbackError) => void
): () => void {
  const feedbackPath = 'feedback';
  const q = query(collection(db, feedbackPath), orderBy('createdAt', 'desc'), limit(200));

  return onSnapshot(
    q,
    (snapshot) => {
      const records: FeedbackRecord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          type: (['rating', 'suggestion', 'bug', 'general'].includes(d.type)
            ? d.type
            : 'general') as FeedbackType,
          rating: typeof d.rating === 'number' ? d.rating : 0,
          category: typeof d.category === 'string' ? d.category : 'General',
          message: typeof d.message === 'string' ? d.message : '',
          page: typeof d.page === 'string' ? d.page : 'home',
          deviceType: (['mobile', 'tablet', 'desktop'].includes(d.deviceType)
            ? d.deviceType
            : 'desktop') as FeedbackDeviceType,
          status: (['new', 'reviewed', 'resolved'].includes(d.status)
            ? d.status
            : 'new') as FeedbackStatus,
          createdAt: toDateOrNull(d.createdAt),
          updatedAt: toDateOrNull(d.updatedAt),
        };
      });
      onData(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, feedbackPath);
      } catch (wrapped) {
        const rawMsg =
          wrapped instanceof Error
            ? wrapped.message
            : 'Failed to load feedback records from Firestore.';
        onError(parseFeedbackError(rawMsg));
      }
    }
  );
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus
): Promise<void> {
  const path = `feedback/${feedbackId}`;
  try {
    await updateDoc(doc(db, 'feedback', feedbackId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFeedbackItem(feedbackId: string): Promise<void> {
  const path = `feedback/${feedbackId}`;
  try {
    await deleteDoc(doc(db, 'feedback', feedbackId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
