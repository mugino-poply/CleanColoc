'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetchAuth } from '@/lib/api';

export default function ColocationChoicePage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      router.push('/login');
      return;
    }

    apiFetchAuth('/api/colocations/me', accessToken)
      .then((res) => {
        if (res.ok) {
          return res.json().then((data) => {
            router.push(`/colocation/${data.colocation.id}`);
          });
        }
        // 404 = pas de coloc → on affiche la page normalement
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [accessToken]);

  if (checking) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        a { text-decoration: none; color: inherit; }

        body {
          font-family: 'DM Sans', sans-serif;
          background: #3d6124;
          background-image:
            radial-gradient(ellipse at 15% 0%,  rgba(142,196,80,.16) 0%, transparent 50%),
            radial-gradient(ellipse at 85% 100%, rgba(20,40,10,.30)   0%, transparent 50%);
          color: #fff;
          min-height: 100vh;
        }

        .btn-outline {
          border-radius: 999px;
          border: 2px solid rgba(255,255,255,.7);
          background: transparent;
          color: #fff;
          padding: 11px 32px;
          font-family: 'DM Sans', sans-serif;
          font-size: .82rem;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background .18s, color .18s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .btn-outline:hover { background: #fff; color: #3d6124; }
        .btn-sm { padding: 7px 20px; font-size: .75rem; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-1 { animation: fadeUp .4s 0.05s ease both; }
        .anim-2 { animation: fadeUp .4s 0.12s ease both; }
        .anim-3 { animation: fadeUp .4s 0.20s ease both; }
        .anim-4 { animation: fadeUp .4s 0.28s ease both; }

        .shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .top-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 40px;
        }
        .top-nav__brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.5rem;
          letter-spacing: .2em;
        }

        .center {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 24px 64px;
          text-align: center;
        }

        .eyebrow {
          color: rgba(255,255,255,.45);
          font-size: .7rem;
          font-weight: 600;
          letter-spacing: .35em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .page-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(2.8rem, 8vw, 4rem);
          letter-spacing: .08em;
          line-height: 1;
          margin-bottom: 14px;
        }

        .page-sub {
          color: rgba(255,255,255,.55);
          font-size: .95rem;
          font-weight: 300;
          line-height: 1.65;
          max-width: 400px;
          margin: 0 auto 48px;
        }

        .choice-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          width: 100%;
          max-width: 600px;
        }

        .choice-card {
          background: rgba(255,255,255,.1);
          backdrop-filter: blur(12px);
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,.15);
          padding: 36px 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          text-decoration: none;
          color: #fff;
          transition: background .2s, transform .2s, box-shadow .2s;
          cursor: pointer;
        }
        .choice-card:hover {
          background: rgba(255,255,255,.17);
          transform: translateY(-3px);
          box-shadow: 0 16px 40px rgba(0,0,0,.2);
        }

        .choice-card__icon {
          font-size: 2.6rem;
          margin-bottom: 18px;
          line-height: 1;
        }

        .choice-card__title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.6rem;
          letter-spacing: .08em;
          margin-bottom: 10px;
        }

        .choice-card__desc {
          color: rgba(255,255,255,.55);
          font-size: .83rem;
          font-weight: 300;
          line-height: 1.6;
          margin-bottom: 28px;
          flex: 1;
        }

        .choice-card__cta {
          border-radius: 999px;
          border: 2px solid #fff;
          background: #fff;
          color: #3d6124;
          padding: 10px 28px;
          font-family: 'DM Sans', sans-serif;
          font-size: .8rem;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          transition: background .18s;
          width: 100%;
        }
        .choice-card:hover .choice-card__cta {
          background: #e8f3df;
          border-color: #e8f3df;
        }

        .choice-card--outline .choice-card__cta {
          background: transparent;
          color: #fff;
          border-color: rgba(255,255,255,.7);
        }
        .choice-card--outline:hover .choice-card__cta {
          background: #fff;
          color: #3d6124;
          border-color: #fff;
        }

        @media (max-width: 540px) {
          .top-nav { padding: 16px 20px; }
          .choice-grid { grid-template-columns: 1fr; max-width: 340px; }
        }
      `}</style>

      <div className="shell">
        <nav className="top-nav anim-1">
          <Link href="/" className="top-nav__brand">
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <path d="M4 15L16 5L28 15V28H21V21H11V28H4V15Z" stroke="white" strokeWidth="2" fill="rgba(255,255,255,.12)" />
              <line x1="10" y1="12" x2="22" y2="12" stroke="white" strokeWidth="1.5" />
            </svg>
            CLEAN&apos; COLOC
          </Link>
        </nav>

        <main className="center">
          <p className="eyebrow anim-2">Votre colocation</p>
          <h1 className="page-title anim-2">Par où commencer ?</h1>
          <p className="page-sub anim-3">
            Créez un nouvel espace partagé, ou rejoignez celui de vos colocataires avec un code d&apos;invitation.
          </p>

          <div className="choice-grid anim-4">
            <Link href="/colocation/create" className="choice-card">
              <div className="choice-card__icon">🏠</div>
              <div className="choice-card__title">Créer</div>
              <p className="choice-card__desc">
                Lancez un nouvel espace de colocation. Vous recevrez un code à partager avec vos colocataires.
              </p>
              <div className="choice-card__cta">Créer une colocation →</div>
            </Link>

            <Link href="/colocation/join" className="choice-card choice-card--outline">
              <div className="choice-card__icon">🔑</div>
              <div className="choice-card__title">Rejoindre</div>
              <p className="choice-card__desc">
                Entrez le code d&apos;invitation partagé par votre colocataire pour rejoindre son espace.
              </p>
              <div className="choice-card__cta">Rejoindre →</div>
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}