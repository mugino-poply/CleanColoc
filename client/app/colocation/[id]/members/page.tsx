'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';

interface Member {
  membershipId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: 'admin' | 'member';
  joinedAt: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    apiFetch(`/api/colocations/${id}/members`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        return res.json();
      })
      .then((data: Member[]) => setMembers(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, accessToken, isAuthenticated, router]);

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

        <h1
          style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: '3rem',
            color: '#fff',
            letterSpacing: '0.05em',
            marginBottom: '2rem',
          }}
        >
          Colocataires
        </h1>

        {loading && (
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>Chargement…</p>
        )}

        {error && (
          <p style={{ color: '#e24b4a' }}>{error}</p>
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
                {/* Avatar */}
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

                {/* Infos */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '1rem',
                    }}
                  >
                    {member.username}
                  </div>
                  <div
                    style={{
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '0.8rem',
                      marginTop: 2,
                    }}
                  >
                    Depuis le{' '}
                    {new Date(member.joinedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>

                {/* Badge rôle */}
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
              </div>
            ))}
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