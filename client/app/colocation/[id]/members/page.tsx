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

/** Décode le payload JWT pour récupérer l'id de l'utilisateur connecté.
 *  Le payload JWT n'est pas chiffré, juste signé — lecture côté client safe. */
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
        // getColocationMembers retourne un tableau direct
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
      // Mise à jour optimiste : retire le membre sans rechargement complet
      setMembers((prev) => prev.filter((m) => m.userId !== pendingRemove.userId));
      setPendingRemove(null);
    } catch {
      setRemoveError('Impossible de joindre le serveur.');
    } finally {
      setRemoving(false);
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
                {/* Avatar — identique à l'original */}
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

                {/* Infos — identique à l'original */}
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

                {/* Badge admin — identique à l'original */}
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

                {/* Bouton Retirer — visible uniquement pour l'admin, pas sur sa propre carte */}
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

        {/* AlertDialog confirmation retrait */}
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