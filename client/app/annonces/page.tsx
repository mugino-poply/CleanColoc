"use client";

import Link from "next/link";

export default function AnnoncesPage() {
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

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-1 { animation: fadeUp .4s 0.05s ease both; }
        .anim-2 { animation: fadeUp .4s 0.12s ease both; }
        .anim-3 { animation: fadeUp .4s 0.20s ease both; }
        .anim-4 { animation: fadeUp .4s 0.30s ease both; }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        .emoji-float {
          display: inline-block;
          animation: float 3s ease-in-out infinite;
        }
        .emoji-float:nth-child(2) { animation-delay: .6s; }
        .emoji-float:nth-child(3) { animation-delay: 1.2s; }

        .page-shell {
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

        .page-center {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 24px 80px;
        }

        .wip-card {
          background: rgba(255,255,255,.1);
          backdrop-filter: blur(12px);
          border-radius: 24px;
          padding: 52px 44px;
          width: 100%;
          max-width: 480px;
          border: 1px solid rgba(255,255,255,.15);
          text-align: center;
        }

        .wip-emojis {
          font-size: 2.8rem;
          margin-bottom: 28px;
          display: flex;
          justify-content: center;
          gap: 12px;
        }

        .wip-eyebrow {
          color: rgba(255,255,255,.45);
          font-size: .7rem;
          font-weight: 600;
          letter-spacing: .35em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .wip-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 3rem;
          letter-spacing: .08em;
          line-height: 1;
          margin-bottom: 16px;
        }

        .wip-desc {
          color: rgba(255,255,255,.55);
          font-size: .9rem;
          font-weight: 300;
          line-height: 1.6;
          margin-bottom: 36px;
        }

        .wip-divider {
          border: none;
          border-top: 1px solid rgba(255,255,255,.12);
          margin-bottom: 28px;
        }
      `}</style>

      <div className="page-shell">
        <nav className="top-nav anim-1">
          <Link href="/" className="top-nav__brand">
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <path d="M4 15L16 5L28 15V28H21V21H11V28H4V15Z" stroke="white" strokeWidth="2" fill="rgba(255,255,255,.12)" />
              <line x1="10" y1="12" x2="22" y2="12" stroke="white" strokeWidth="1.5" />
            </svg>
            CLEAN&apos; COLOC
          </Link>
        </nav>

        <main className="page-center">
          <div className="wip-card">
            <div className="wip-emojis anim-2">
              <span className="emoji-float">👷</span>
              <span className="emoji-float">🚧</span>
            </div>

            <p className="wip-eyebrow anim-2">Bientôt disponible</p>
            <h1 className="wip-title anim-3">En construction</h1>
            <p className="wip-desc anim-3">
              Cette section est en cours de développement.<br />
              Revenez bientôt, on bosse dessus !
            </p>

            <hr className="wip-divider" />

            <div className="anim-4">
              <Link href="/" className="btn-outline">
                ← Retour à l&apos;accueil
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}