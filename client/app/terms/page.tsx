"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <>
      <style>{`
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

        .terms-shell { min-height: 100vh; display: flex; flex-direction: column; }

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

        .terms-center {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 24px 64px;
        }

        .terms-card {
          background: rgba(255,255,255,.1);
          backdrop-filter: blur(12px);
          border-radius: 24px;
          padding: 40px 36px;
          width: 100%;
          max-width: 460px;
          border: 1px solid rgba(255,255,255,.15);
        }

        .terms-card__eyebrow {
          color: rgba(255,255,255,.45);
          font-size: .7rem;
          font-weight: 600;
          letter-spacing: .35em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .terms-card__title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2.8rem;
          letter-spacing: .08em;
          line-height: 1;
          margin-bottom: 24px;
        }

        .terms-card__body {
          color: rgba(255,255,255,.75);
          font-size: .95rem;
          font-weight: 300;
          line-height: 1.7;
          margin-bottom: 32px;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: rgba(255,255,255,.55);
          font-size: .85rem;
          font-weight: 500;
          transition: color .18s;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,.12);
          width: 100%;
        }
        .back-link:hover { color: #fff; }

        @media (max-width: 480px) {
          .terms-card { padding: 28px 20px; }
          .top-nav { padding: 20px 20px; }
        }
      `}</style>

      <div className="terms-shell">
        <nav className="top-nav anim-1">
          <Link href="/" className="top-nav__brand">
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <path d="M4 15L16 5L28 15V28H21V21H11V28H4V15Z" stroke="white" strokeWidth="2" fill="rgba(255,255,255,.12)" />
              <line x1="10" y1="12" x2="22" y2="12" stroke="white" strokeWidth="1.5" />
            </svg>
            CLEAN&apos; COLOC
          </Link>
        </nav>

        <main className="terms-center">
          <div className="terms-card anim-2">
            <p className="terms-card__eyebrow">Légal</p>
            <h1 className="terms-card__title">Conditions d&apos;utilisation</h1>
            <p className="terms-card__body anim-3">
              Ce projet étant réalisé dans un cadre académique, il n&apos;y a pas de réelles
              conditions d&apos;utilisation pour l&apos;instant. Faites-vous plaisir.
            </p>
            <Link href="/register" className="back-link">
              ← Retour à l&apos;inscription
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
