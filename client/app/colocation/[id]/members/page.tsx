'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../../components/ui/alert-dialog';

interface Member {
  membershipId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: 'admin' | 'member';
  joinedAt: string;
}

function getUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id ?? null;
  } catch {
    return null;
  }
}

export default function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { accessToken, isAuthenticated } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState<string>('');
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pendingRemove, setPendingRemove] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // US-10 — Quitter la colocation
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!accessToken) return;

    setMyUserId(getUserIdFromToken(accessToken));

    Promise.all([
      apiFetch('/api/colocations/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      apiFetch(`/api/colocations/${id}/members`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ])
      .then(async ([meRes, membersRes]) => {
        if (!meRes.ok || !membersRes.ok) throw new Error('Erreur de chargement');
        const meData = await meRes.json();
        setMyRole(meData.role ?? '');
        setInviteCode(meData.colocation?.inviteCode ?? null);
        const data: Member[] = await membersRes.json();
        setMembers(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, accessToken, isAuthenticated, router]);

  const handleRemove = async () => {
    if (!pendingRemove || !accessToken) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      const res = await apiFetch(
        `/api/colocations/${id}/members/${pendingRemove.userId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setRemoveError(data.message || 'Erreur lors du retrait.');
        return;
      }
      setMembers((prev) => prev.filter((m) => m.userId !== pendingRemove.userId));
      setPendingRemove(null);
    } catch {
      setRemoveError('Impossible de joindre le serveur.');
    } finally {
      setRemoving(false);
    }
  };

  const handleLeave = async () => {
    if (!accessToken) return;
    setLeaving(true);
    setLeaveError(null);
    try {
      const res = await apiFetch(`/api/colocations/${id}/members/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 204) {
        router.push('/colocation');
      } else {
        const data = await res.json();
        setLeaveError(data.message || 'Une erreur est survenue.');
      }
    } catch {
      setLeaveError('Impossible de contacter le serveur.');
    } finally {
      setLeaving(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at top, #4a7a2e 0%, #3d6124 60%, #2a4318 100%)',
        padding: '2rem 1rem',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <button
          onClick={() => router.push(`/colocation/${id}`)}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.4)',
            color: '#fff',
            borderRadius: 999,
            padding: '0.4rem 1.2rem',
            cursor: 'pointer',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
          }}
        >
          ← Retour
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <h1 style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: '3rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: 0,
          }}>
            Colocataires
          </h1>

          {inviteCode && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              style={{
                background: copied ? 'rgba(100,200,100,0.2)' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 12,
                padding: '0.5rem 1rem',
                color: '#fff',
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: '1.1rem',
                letterSpacing: '0.15em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              {inviteCode}
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem', opacity: 0.7, fontWeight: 400, letterSpacing: 0 }}>
                {copied ? 'Copié !' : 'Copier'}
              </span>
            </button>
          )}
        </div>

        {loading && <p style={{ color: 'rgba(255,255,255,0.7)' }}>Chargement…</p>}
        {error && <p style={{ color: '#e24b4a' }}>{error}</p>}
        {removeError && (
          <p style={{ color: '#e24b4a', marginBottom: '1rem' }}>{removeError}</p>
        )}

        {!loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {members.map((member, i) => (
              <div
                key={member.membershipId}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: 24,
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  opacity: 0,
                  animation: `fadeUp 0.4s ease forwards`,
                  animationDelay: `${i * 0.08}s`,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    overflow: 'hidden',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    color: '#fff',
                    fontWeight: 600,
                  }}
                >
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.username}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    member.username.charAt(0).toUpperCase()
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>
                    {member.username}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginTop: 2 }}>
                    Depuis le{' '}
                    {new Date(member.joinedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>

                {member.role === 'admin' && (
                  <span
                    style={{
                      background: '#fff',
                      color: '#3d6124',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: 999,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Admin
                  </span>
                )}

                {myRole === 'admin' && member.userId !== myUserId && (
                  <button
                    onClick={() => {
                      setRemoveError(null);
                      setPendingRemove(member);
                    }}
                    style={{
                      background: 'rgba(226,75,74,0.15)',
                      border: '1px solid rgba(226,75,74,0.4)',
                      color: '#e24b4a',
                      borderRadius: 999,
                      padding: '0.3rem 0.9rem',
                      fontSize: '0.8rem',
                      fontFamily: 'DM Sans, sans-serif',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Retirer
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Bouton quitter la colocation */}
        {!loading && !error && (
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button
              onClick={() => setShowLeaveModal(true)}
              style={{
                background: 'rgba(220,50,50,0.15)',
                border: '1px solid rgba(220,50,50,0.4)',
                color: '#ff8080',
                borderRadius: '12px',
                padding: '0.6rem 1.5rem',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Quitter la colocation
            </button>
          </div>
        )}

        {/* AlertDialog confirmation retrait membre */}
        <AlertDialog
          open={!!pendingRemove}
          onOpenChange={(open) => { if (!open) setPendingRemove(null); }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Retirer {pendingRemove?.username} de la colocation ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Ce membre sera retiré immédiatement. Ses tâches en cours seront
                désassignées. Cette action ne peut pas être annulée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemove} disabled={removing}>
                {removing ? 'Retrait…' : 'Confirmer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modale quitter la colocation */}
        {showLeaveModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: '1rem',
          }}>
            <div style={{
              background: '#2a4419', borderRadius: '16px', padding: '1.5rem',
              width: '100%', maxWidth: '360px', border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h2 style={{ color: '#ff8080', marginBottom: '0.5rem', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.5rem' }}>
                Quitter la colocation
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Es-tu sûr(e) de vouloir quitter cette colocation ? Cette action est irréversible.
                {myRole === 'admin' && members.length > 1 && (
                  <span style={{ display: 'block', marginTop: '0.5rem', color: '#ffb347' }}>
                    ⚠️ Tu es admin. Transfère d'abord le rôle admin à un autre membre.
                  </span>
                )}
              </p>
              {leaveError && (
                <p style={{ color: '#ff8080', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  {leaveError}
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => { setShowLeaveModal(false); setLeaveError(null); }}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff', borderRadius: '8px', padding: '0.5rem',
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleLeave}
                  disabled={leaving}
                  style={{
                    flex: 1, background: '#c0392b', border: 'none',
                    color: '#fff', borderRadius: '8px', padding: '0.5rem',
                    cursor: leaving ? 'not-allowed' : 'pointer',
                    opacity: leaving ? 0.6 : 1,
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                  }}
                >
                  {leaving ? 'En cours...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}