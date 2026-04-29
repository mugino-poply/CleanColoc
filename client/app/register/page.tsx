"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function getStrengthScore(val: string): number {
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    return score;
  }

  const strengthColors = ["#e24b4a", "#ef9f27", "#8ec450", "#3d6124"];
  const strengthScore = getStrengthScore(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!terms) {
      setError("Vous devez accepter les conditions d'utilisation.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Une erreur est survenue lors de l'inscription.");
      } else {
        router.push("/login");
      }
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

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
          width: 100%;
        }
        .btn-solid:hover:not(:disabled) { background: #e8f3df; border-color: #e8f3df; }
        .btn-solid:disabled { opacity: .6; cursor: not-allowed; }
        .btn-sm { padding: 7px 20px; font-size: .75rem; width: auto; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-1 { animation: fadeUp .4s 0.05s ease both; }
        .anim-2 { animation: fadeUp .4s 0.12s ease both; }
        .anim-3 { animation: fadeUp .4s 0.20s ease both; }

        .register-shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* Nav */
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

        /* Center layout */
        .register-center {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 24px 64px;
        }

        /* Card */
        .register-card {
          background: rgba(255,255,255,.1);
          backdrop-filter: blur(12px);
          border-radius: 24px;
          padding: 40px 36px;
          width: 100%;
          max-width: 460px;
          border: 1px solid rgba(255,255,255,.15);
        }

        .register-card__eyebrow {
          color: rgba(255,255,255,.45);
          font-size: .7rem;
          font-weight: 600;
          letter-spacing: .35em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .register-card__title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2.8rem;
          letter-spacing: .08em;
          line-height: 1;
          margin-bottom: 6px;
        }
        .register-card__sub {
          color: rgba(255,255,255,.55);
          font-size: .88rem;
          font-weight: 300;
          margin-bottom: 28px;
        }

        /* Form */
        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .form-field {
          margin-bottom: 16px;
        }
        .form-field label {
          display: block;
          font-size: .78rem;
          font-weight: 600;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: rgba(255,255,255,.7);
          margin-bottom: 8px;
        }
        .form-field input {
          width: 100%;
          background: rgba(255,255,255,.12);
          border: 1.5px solid rgba(255,255,255,.2);
          border-radius: 12px;
          padding: 13px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: .95rem;
          color: #fff;
          outline: none;
          transition: border-color .18s, background .18s;
        }
        .form-field input::placeholder { color: rgba(255,255,255,.35); }
        .form-field input:focus {
          border-color: rgba(255,255,255,.6);
          background: rgba(255,255,255,.18);
        }

        /* Password strength */
        .strength-bars {
          display: flex;
          gap: 4px;
          margin-top: 6px;
        }
        .strength-bar {
          flex: 1;
          height: 3px;
          border-radius: 99px;
          background: rgba(255,255,255,.15);
          transition: background .3s;
        }

        /* Terms */
        .terms-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 22px;
          margin-top: 4px;
        }
        .terms-row input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #8ec450;
          margin-top: 2px;
          flex-shrink: 0;
          cursor: pointer;
        }
        .terms-row span {
          font-size: .82rem;
          color: rgba(255,255,255,.6);
          line-height: 1.5;
        }
        .terms-row a {
          color: #fff;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .terms-row a:hover { color: #c8e8a0; }

        /* Error */
        .form-error {
          background: rgba(220,60,60,.25);
          border: 1px solid rgba(220,60,60,.4);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: .83rem;
          color: #ffb3b3;
          margin-bottom: 20px;
        }

        /* Login link */
        .login-prompt {
          text-align: center;
          font-size: .85rem;
          color: rgba(255,255,255,.5);
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,.12);
        }
        .login-prompt a {
          color: #fff;
          font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .login-prompt a:hover { color: #c8e8a0; }

        /* Responsive */
        @media (max-width: 480px) {
          .top-nav { padding: 14px 16px; }
          .top-nav__brand { font-size: 1rem; gap: 8px; }
          .top-nav__brand svg { width: 24px; height: 24px; }
          .top-nav__actions .btn-sm { padding: 6px 14px; font-size: .7rem; }
          .register-card { padding: 28px 20px; border-radius: 20px; }
          .register-card__title { font-size: 2.2rem; }
          .form-row-2 { grid-template-columns: 1fr; gap: 0; }
        }
      `}</style>

      <div className="register-shell">

        {/* ── Nav ── */}
        <nav className="top-nav anim-1">
          <Link href="/" className="top-nav__brand">
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
          </Link>
          <div className="top-nav__actions">
            <Link href="/login" className="btn-outline btn-sm">
              Se connecter
            </Link>
          </div>
        </nav>

        {/* ── Form ── */}
        <main className="register-center">
          <div className="register-card anim-2">
            <p className="register-card__eyebrow">Bienvenue 🏠</p>
            <h1 className="register-card__title">Inscription</h1>
            <p className="register-card__sub">Créez votre compte et rejoignez votre colocation.</p>

            <form onSubmit={handleSubmit} className="anim-3">

              {/* Prénom / Nom */}
              <div className="form-row-2">
                <div className="form-field">
                  <label htmlFor="firstName">Prénom</label>
                  <input
                    id="firstName"
                    type="text"
                    placeholder="Marie"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="lastName">Nom</label>
                  <input
                    id="lastName"
                    type="text"
                    placeholder="Dupont"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="form-field">
                <label htmlFor="email">Adresse email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              {/* Mot de passe */}
              <div className="form-field">
                <label htmlFor="password">Mot de passe</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                {/* Indicateur de force */}
                <div className="strength-bars">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="strength-bar"
                      style={{
                        background:
                          i < strengthScore
                            ? strengthColors[strengthScore - 1]
                            : "rgba(255,255,255,.15)",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Confirmer mot de passe */}
              <div className="form-field" style={{ marginBottom: "20px" }}>
                <label htmlFor="confirm">Confirmer le mot de passe</label>
                <input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              {/* CGU */}
              <div className="terms-row">
                <input
                  type="checkbox"
                  id="terms"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                />
                <span>
                  J&apos;accepte les{" "}
                  <Link href="/terms">conditions d&apos;utilisation</Link>{" "}
                  et la{" "}
                  <Link href="/privacy">politique de confidentialité</Link>
                </span>
              </div>

              {error && <div className="form-error">{error}</div>}

              <button type="submit" className="btn-solid" disabled={loading}>
                {loading ? "Création du compte…" : "Créer mon compte →"}
              </button>
            </form>

            <div className="login-prompt">
              Déjà un compte ?{" "}
              <Link href="/login">Se connecter</Link>
            </div>
          </div>
        </main>

      </div>
    </>
  );
}