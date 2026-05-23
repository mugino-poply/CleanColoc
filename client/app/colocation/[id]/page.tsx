'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { apiFetch } from '../../../lib/api';

interface Colocation {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
}

interface NavCard {
  icon: string;
  title: string;
  description: string;
  href: string;
  suffix?: string;
}

const NAV_CARDS: NavCard[] = [
  {
    icon: '👤',
    title: 'Mon profil',
    description: 'Paramètres, avatar, compte',
    href: '/compte',
  },
  {
    icon: '🏠',
    title: 'Ma colocation',
    description: "Membres, code d'invitation",
    href: '',
    suffix: '/members',
  },
  {
    icon: '✅',
    title: 'Les tâches',
    description: 'Tâches ménagères, rotations',
    href: '',
    suffix: '/tasks',
  },
  {
    icon: '💸',
    title: 'Les dépenses',
    description: 'Dépenses partagées, soldes',
    href: '',
    suffix: '/expenses',
  },
];

export default function ColocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { accessToken, isAuthenticated } = useAuth();
  const [colocation, setColocation] = useState<Colocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    apiFetch('/api/colocations/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          router.push('/colocation');
          return;
        }
        const data = await res.json();
        setColocation(data.colocation);
      })
      .catch(() => router.push('/colocation'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, accessToken, router]);

  const copyInviteCode = () => {
    if (!colocation) return;
    navigator.clipboard.writeText(colocation.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at top, #4a7c2f 0%, #3d6124 60%, #2a4419 100%)',
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif' }}>
          Chargement...
        </p>
      </main>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-1 { animation: fadeUp .4s ease both .05s; }
        .anim-2 { animation: fadeUp .4s ease both .10s; }
        .anim-3 { animation: fadeUp .4s ease both .15s; }
        .anim-4 { animation: fadeUp .4s ease both .20s; }
        .anim-5 { animation: fadeUp .4s ease both .25s; }
        .nav-card {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(12px);
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.15);
          padding: 28px 24px;
          cursor: pointer;
          transition: background .2s, transform .2s;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
          color: #fff;
        }
        .nav-card:hover {
          background: rgba(255,255,255,0.18);
          transform: translateY(-2px);
        }
        .invite-btn {
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 12px;
          padding: 8px 16px;
          color: #fff;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.1rem;
          letter-spacing: .15em;
          cursor: pointer;
          transition: background .2s;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .invite-btn:hover { background: rgba(255,255,255,0.2); }
        .invite-btn.copied { background: rgba(100,200,100,0.25); }
      `}</style>

      <main
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(ellipse at top, #4a7c2f 0%, #3d6124 60%, #2a4419 100%)',
          color: '#fff',
          padding: '48px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div style={{ width: '100%', maxWidth: '560px' }}>
          <div className="anim-1" style={{ marginBottom: '12px' }}>
            <p
              style={{
                fontFamily: 'DM Sans',
                fontWeight: 300,
                fontSize: '0.9rem',
                color: 'rgba(255,255,255,0.5)',
                marginBottom: '4px',
              }}
            >
              Bienvenue dans
            </p>
            <h1
              style={{
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: '3.5rem',
                letterSpacing: '.08em',
                lineHeight: 1,
              }}
            >
              {colocation?.name ?? 'Ma Colocation'}
            </h1>
          </div>

          <div className="anim-2" style={{ marginBottom: '40px' }}>
            <button
              className={copied ? 'invite-btn copied' : 'invite-btn'}
              onClick={copyInviteCode}
            >
              <span>{colocation?.inviteCode}</span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'DM Sans',
                  fontWeight: 400,
                  opacity: 0.7,
                }}
              >
                {copied ? 'Copié !' : 'Copier le code'}
              </span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {NAV_CARDS.map((card, i) => {
              const href = card.href || `/colocation/${id}${card.suffix ?? ''}`;
              const animClass = `nav-card anim-${i + 3}`;
              return (
                <Link key={card.title} className={animClass} href={href}>
                  <span style={{ fontSize: '2rem' }}>{card.icon}</span>
                  <span
                    style={{
                      fontFamily: 'Bebas Neue, sans-serif',
                      fontSize: '1.4rem',
                      letterSpacing: '.06em',
                    }}
                  >
                    {card.title}
                  </span>
                  <span
                    style={{
                      fontFamily: 'DM Sans',
                      fontWeight: 300,
                      fontSize: '0.85rem',
                      color: 'rgba(255,255,255,0.6)',
                    }}
                  >
                    {card.description}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}