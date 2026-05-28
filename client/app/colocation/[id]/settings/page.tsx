// client/app/colocation/[id]/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../../components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';

interface Member {
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: 'admin' | 'member';
}

export default function ColocationSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const { accessToken, isAuthenticated } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState<'admin' | 'member' | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const fetchData = async () => {
      try {
        const [meRes, membersRes] = await Promise.all([
          apiFetch('/api/colocations/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          apiFetch(`/api/colocations/${id}/members`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ]);

        if (!meRes.ok || !membersRes.ok) {
          router.push(`/colocation/${id}`);
          return;
        }

        const meData = await meRes.json();
        const membersData: Member[] = await membersRes.json();

        setMyRole(meData.role);

        if (meData.role !== 'admin') {
          router.push(`/colocation/${id}`);
          return;
        }

        setMembers(membersData.filter((m) => m.role !== 'admin'));
      } catch {
        router.push(`/colocation/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, accessToken, id, router]);

  const handleTransfer = async () => {
    if (!selectedUserId || !accessToken) return;
    setTransferring(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/colocations/${id}/admin/transfer`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toUserId: selectedUserId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Une erreur est survenue.');
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push(`/colocation/${id}`), 2000);
    } catch {
      setError('Impossible de joindre le serveur.');
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(ellipse at top, #4a7a2e 0%, #3d6124 50%, #2d4a1a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'DM Sans, sans-serif',
          color: 'white',
        }}
      >
        Chargement…
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #4a7a2e 0%, #3d6124 50%, #2d4a1a 100%)',
        fontFamily: 'DM Sans, sans-serif',
        color: 'white',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <button
          onClick={() => router.push(`/colocation/${id}`)}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '12px',
            color: 'white',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            marginBottom: '2rem',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          ← Retour
        </button>

        <h1
          style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: '2.5rem',
            letterSpacing: '0.05em',
            marginBottom: '2rem',
          }}
        >
          Paramètres admin
        </h1>

        {success ? (
          <div
            style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '24px',
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>✅ Rôle admin transféré.</p>
            <p style={{ opacity: 0.7 }}>Redirection en cours…</p>
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(12px)',
              borderRadius: '24px',
              padding: '2rem',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <h2
              style={{
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: '1.4rem',
                letterSpacing: '0.05em',
                marginBottom: '0.5rem',
              }}
            >
              Transmettre le rôle admin
            </h2>
            <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              L'ancien admin repasse immédiatement en membre. Cette action est irréversible
              sans une nouvelle transmission.
            </p>

            {members.length === 0 ? (
              <p style={{ opacity: 0.6, fontStyle: 'italic' }}>
                Aucun autre membre dans la colocation.
              </p>
            ) : (
              <>
                <Select onValueChange={setSelectedUserId} value={selectedUserId}>
                  <SelectTrigger
                    style={{
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '12px',
                      color: 'white',
                      marginBottom: '1rem',
                    }}
                  >
                    <SelectValue placeholder="Choisir un membre…" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {error && (
                  <p style={{ color: '#e24b4a', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    {error}
                  </p>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      disabled={!selectedUserId || transferring}
                      style={{
                        width: '100%',
                        background: selectedUserId ? 'white' : 'rgba(255,255,255,0.3)',
                        color: '#3d6124',
                        border: 'none',
                        borderRadius: '999px',
                        padding: '0.75rem',
                        fontFamily: 'DM Sans, sans-serif',
                        fontWeight: 600,
                        fontSize: '1rem',
                        cursor: selectedUserId ? 'pointer' : 'not-allowed',
                        transition: 'background 0.2s',
                      }}
                    >
                      Transmettre le rôle admin
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmer le transfert</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est immédiate et irréversible sans une nouvelle transmission.
                        Vous repasserez en membre simple.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleTransfer} disabled={transferring}>
                        {transferring ? 'Transfert…' : 'Confirmer'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}