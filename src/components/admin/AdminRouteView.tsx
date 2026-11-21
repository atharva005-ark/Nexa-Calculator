import React, { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase/client';
import { AdminLoginView } from './AdminLoginView';
import { AdminDashboardView } from './AdminDashboardView';

interface AdminRouteViewProps {
  onBackToCalculator: () => void;
}

export const AdminRouteView: React.FC<AdminRouteViewProps> = ({ onBackToCalculator }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [authorizedVia, setAuthorizedVia] = useState<'owner' | 'admin_emails'>('owner');
  const [verifyingSession, setVerifyingSession] = useState<boolean>(true);
  const [signingIn, setSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const verifySeqRef = useRef(0);

  const verifyWithServer = useCallback(async (user: User | null) => {
    const seq = ++verifySeqRef.current;

    if (!user) {
      setVerifiedEmail(null);
      setVerifyingSession(false);
      return;
    }

    setVerifyingSession(true);
    setAuthError(null);
    try {
      const idToken = await user.getIdToken(true);
      if (seq !== verifySeqRef.current) return;

      const resp = await fetch('/api/admin/session', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      });
      if (seq !== verifySeqRef.current) return;

      const contentType = (resp.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('application/json')) {
        throw new Error('Administrator authentication service returned an invalid response.');
      }

      const data = (await resp.json()) as {
        authenticated?: boolean;
        admin?: { email?: string; authorizedVia?: 'owner' | 'admin_emails' };
        error?: string;
      };

      if (!resp.ok || !data.authenticated) {
        setVerifiedEmail(null);
        setAuthError(
          data.error || 'Access denied. This account does not have administrator privileges.'
        );
        return;
      }

      setVerifiedEmail(data.admin?.email || user.email || null);
      setAuthorizedVia(data.admin?.authorizedVia === 'admin_emails' ? 'admin_emails' : 'owner');
      setAuthError(null);
    } catch (err) {
      if (seq !== verifySeqRef.current) return;
      setVerifiedEmail(null);
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Unable to verify administrator session with the server.'
      );
    } finally {
      if (seq === verifySeqRef.current) {
        setVerifyingSession(false);
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      void verifyWithServer(user);
    });
    return unsubscribe;
  }, [verifyWithServer]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will receive the signed-in user and run verifyWithServer once
    } catch (err) {
      const message =
        err instanceof Error && err.message.includes('popup-closed-by-user')
          ? 'Sign-in popup was closed before completing authentication.'
          : err instanceof Error
            ? err.message
            : 'Google sign-in failed. Please try again.';
      setAuthError(message);
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    setVerifiedEmail(null);
    await signOut(auth);
  };

  if (firebaseUser && verifiedEmail && !verifyingSession) {
    return (
      <AdminDashboardView
        firebaseUser={firebaseUser}
        adminEmail={verifiedEmail}
        authorizedVia={authorizedVia}
        onSignOut={() => void handleSignOut()}
        onBackToCalculator={onBackToCalculator}
      />
    );
  }

  return (
    <AdminLoginView
      loading={verifyingSession}
      signingIn={signingIn}
      error={authError}
      signedInEmail={firebaseUser?.email ?? null}
      onGoogleSignIn={() => void handleGoogleSignIn()}
      onSignOut={() => void handleSignOut()}
      onBackToCalculator={onBackToCalculator}
    />
  );
};
