import Link from "next/link";

export default function LandingPage() {
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

        /* Buttons */
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

        .btn-solid {
          border-radius: 999px;
          border: 2px solid #fff;
          background: #fff;
          color: #3d6124;
          padding: 11px 32px;
          font-family: 'DM Sans', sans-serif;
          font-size: .82rem;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background .18s, border-color .18s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .btn-solid:hover { background: #e8f3df; border-color: #e8f3df; }
        .btn-sm { padding: 7px 20px; font-size: .75rem; }

        /* Card */
        .card {
          background: rgba(255,255,255,.1);
          backdrop-filter: blur(8px);
          border-radius: 20px;
          padding: 24px;
          transition: transform .2s, box-shadow .2s;
        }
        .card:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,.18); }

        /* Animations */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-1 { animation: fadeUp .4s 0.05s ease both; }
        .anim-2 { animation: fadeUp .4s 0.12s ease both; }
        .anim-3 { animation: fadeUp .4s 0.20s ease both; }
        .anim-4 { animation: fadeUp .4s 0.28s ease both; }
        .anim-5 { animation: fadeUp .5s 0.36s ease both; }

        /* Layout */
        .landing-shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* Top nav */
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
        .top-nav__actions { display: flex; gap: 12px; }

        /* Hero */
        .hero {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 48px 24px 64px;
        }
        .hero__eyebrow {
          color: rgba(255,255,255,.4);
          font-size: .72rem;
          font-weight: 600;
          letter-spacing: .35em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }
        .hero__title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(5rem, 13vw, 6.5rem);
          line-height: 1;
          letter-spacing: .08em;
          margin-bottom: 24px;
        }
        .hero__subtitle {
          color: rgba(255,255,255,.6);
          font-size: 1.1rem;
          font-weight: 300;
          line-height: 1.65;
          max-width: 480px;
          margin-bottom: 40px;
        }
        .hero__cta {
          display: flex;
          gap: 16px;
          margin-bottom: 60px;
          flex-wrap: wrap;
          justify-content: center;
        }

        /* Features grid */
        .features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          max-width: 680px;
          width: 100%;
        }
        .feature-card { text-align: center; }
        .feature-card__icon  { font-size: 1.8rem; margin-bottom: 12px; }
        .feature-card__title { font-size: .95rem; font-weight: 600; margin-bottom: 6px; }
        .feature-card__text  { color: rgba(255,255,255,.5); font-size: .82rem; line-height: 1.5; }

        /* ── RESPONSIVE TABLETTE ── */
        @media (max-width: 768px) {
          .top-nav {
            padding: 16px 20px;
          }
          .top-nav__brand {
            font-size: 1.2rem;
          }
          .top-nav__brand svg {
            width: 28px;
            height: 28px;
          }
          .hero {
            padding: 32px 20px 48px;
          }
          .hero__subtitle {
            font-size: 1rem;
          }
          .features {
            grid-template-columns: 1fr 1fr;
            max-width: 480px;
            gap: 12px;
          }
          /* La 3e carte prend toute la largeur */
          .feature-card:last-child {
            grid-column: 1 / -1;
          }
        }

        /* ── RESPONSIVE MOBILE ── */
        @media (max-width: 480px) {
          .top-nav {
            padding: 14px 16px;
          }
          .top-nav__brand {
            font-size: 1rem;
            gap: 8px;
          }
          .top-nav__brand svg {
            width: 24px;
            height: 24px;
          }
          /* Boutons navbar plus compacts */
          .top-nav__actions .btn-sm {
            padding: 6px 14px;
            font-size: .7rem;
          }

          .hero {
            padding: 24px 16px 40px;
          }
          .hero__eyebrow {
            font-size: .65rem;
            letter-spacing: .2em;
          }
          .hero__title {
            font-size: clamp(3.5rem, 18vw, 5rem);
            margin-bottom: 16px;
          }
          .hero__subtitle {
            font-size: .95rem;
            margin-bottom: 28px;
          }
          /* Boutons CTA en colonne sur mobile */
          .hero__cta {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
            margin-bottom: 40px;
            width: 100%;
            max-width: 300px;
          }
          .hero__cta a {
            width: 100%;
          }

          /* Feature cards en colonne */
          .features {
            grid-template-columns: 1fr;
            max-width: 100%;
            gap: 12px;
          }
          .feature-card:last-child {
            grid-column: auto;
          }
          .card {
            padding: 20px 16px;
          }
          .feature-card__icon { font-size: 1.5rem; margin-bottom: 8px; }
          .feature-card__title { font-size: .9rem; }
          .feature-card__text  { font-size: .8rem; }
        }
      `}</style>

      <div className="landing-shell">

        {/* ── Top Nav ── */}
        <nav className="top-nav anim-1">
          <div className="top-nav__brand">
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <path
                d="M4 15L16 5L28 15V28H21V21H11V28H4V15Z"
                stroke="white"
                strokeWidth="2"
                fill="rgba(255,255,255,.12)"
              />
              <line x1="10" y1="12" x2="22" y2="12" stroke="white" strokeWidth="1.5" />
            </svg>
            CLEAN&apos; COLOC
          </div>
          <div className="top-nav__actions">
            <Link href="/login" className="btn-outline btn-sm">
              Se connecter
            </Link>
            <Link href="/register" className="btn-solid btn-sm">
              S&apos;inscrire
            </Link>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="hero">
          <p className="hero__eyebrow anim-1">La colocation, sans les prises de tête</p>

          <h1 className="hero__title anim-2">
            CLEAN&apos;<br />COLOC
          </h1>

          <p className="hero__subtitle anim-3">
            Gérez les tâches ménagères et les dépenses partagées avec vos colocataires.
            Simple, équitable, sans drama.
          </p>

          <div className="hero__cta anim-4">
            <Link href="/register" className="btn-solid">
              Commencer gratuitement
            </Link>
            <Link href="/annonces" className="btn-outline">
              Voir les annonces
            </Link>
          </div>

          {/* ── Feature cards ── */}
          <div className="features anim-5">
            {[
              {
                icon: "🧹",
                title: "Tâches ménagères",
                text: "Planning rotatif automatique, notifications, suivi en temps réel.",
              },
              {
                icon: "💸",
                title: "Dépenses partagées",
                text: "Qui doit quoi à qui ? Solde calculé automatiquement.",
              },
              {
                icon: "🏠",
                title: "Gestion de coloc",
                text: "Invitez vos colocataires par lien, gérez votre groupe facilement.",
              },
            ].map((f) => (
              <div key={f.title} className="card feature-card">
                <div className="feature-card__icon">{f.icon}</div>
                <div className="feature-card__title">{f.title}</div>
                <div className="feature-card__text">{f.text}</div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </>
  );
}