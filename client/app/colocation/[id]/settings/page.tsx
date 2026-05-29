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

interface ColocationData {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  autoRotation: boolean;
}

export default function ColocationSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const { accessToken, isAuthenticated } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  // US-41 — Infos colocation
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [infoSuccess, setInfoSuccess] = useState(false);

  // US-42 — InviteCode
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  // US-39 — Transfert admin (code existant conservé)
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState(false);

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
        if (meData.role !== 'admin') {
          router.push(`/colocation/${id}`);
          return;
        }

        const coloc: ColocationData = meData.colocation;
        setName(coloc.name ?? '');
        setDescription(coloc.description ?? '');
        setOriginalName(coloc.name ?? '');
        setOriginalDescription(coloc.description ?? '');
        setInviteCode(coloc.inviteCode ?? '');

        // getColocationMembers retourne un tableau direct, pas { members: [...] }
        const membersData: Member[] = await membersRes.json();
        setMembers(membersData.filter((m) => m.role !== 'admin'));
      } catch {
        router.push(`/colocation/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, accessToken, id, router]);

  const isDirty =
    name.trim() !== originalName.trim() || description !== originalDescription;

  const handleSaveInfo = async () => {
    setInfoError(null);
    setInfoSuccess(false);
    setInfoSaving(true);
    try {
      const body: Record<string, string> = {};
      if (name.trim() !== originalName.trim()) body.name = name.trim();
      if (description !== originalDescription) body.description = description;

      const res = await apiFetch(`/api/colocations/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setInfoError(data.message || 'Erreur lors de la sauvegarde.');
        return;
      }
      setOriginalName(data.colocation.name);
      setOriginalDescription(data.colocation.description ?? '');
      setName(data.colocation.name);
      setDescription(data.colocation.description ?? '');
      setInfoSuccess(true);
      setTimeout(() => setInfoSuccess(false), 3000);
    } catch {
      setInfoError('Impossible de joindre le serveur.');
    } finally {
      setInfoSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    setRegenError(null);
    setRegenerating(true);
    try {
      const res = await apiFetch(`/api/colocations/${id}/invite-code/regenerate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setRegenError(data.message || 'Erreur lors de la régénération.');
        return;
      }
      setInviteCode(data.inviteCode);
      setCopied(false);
    } catch {
      setRegenError('Impossible de joindre le serveur.');
    } finally {
      setRegenerating(false);
    }
  };

  // Code US-39 conservé à l'identique
  const handleTransfer = async () => {
    if (!selectedUserId || !accessToken) return;
    setTransferring(true);
    setTransferError(null);
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
        setTransferError(data.error || 'Une erreur est survenue.');
        return;
      }
      setTransferSuccess(true);
      setTimeout(() => router.push(`/colocation/${id}`), 2000);
    } catch {
      setTransferError('Impossible de joindre le serveur.');
    } finally {
      setTransferring(false);
    }
  };

  const mainStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'radial-gradient(ellipse at top, #4a7a2e 0%, #3d6124 50%, #2d4a1a 100%)',
    fontFamily: 'DM Sans, sans-serif',
    color: 'white',
    padding: '2rem',
  };

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(12px)',
    borderRadius: '24px',
    padding: '2rem',
    border: '1px solid rgba(255,255,255,0.15)',
    marginBottom: '1.5rem',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    color: 'white',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '1rem',
    padding: '0.6rem 0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const sectionTitle: React.CSSProperties = {
    fontFamily: 'Bebas Neue, sans-serif',
    fontSize: '1.4rem',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
  };

  if (loading) {
    return (
      <main style={{ ...mainStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Chargement…
      </main>
    );
  }

  return (
    <main style={mainStyle}>
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

        {/* US-41 — Informations */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Informations</h2>
          <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Modifie le nom ou la description de la colocation.
          </p>

          <label style={{ display: 'block', opacity: 0.8, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            Nom
          </label>
          <input
            style={{ ...inputStyle, marginBottom: '1rem' }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de la coloc"
          />

          <label style={{ display: 'block', opacity: 0.8, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            Description
          </label>
          <textarea
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Une courte description…"
          />

          {infoError && (
            <p style={{ color: '#e24b4a', fontSize: '0.9rem', marginTop: '0.75rem' }}>{infoError}</p>
          )}
          {infoSuccess && (
            <p style={{ color: '#8ec450', fontSize: '0.9rem', marginTop: '0.75rem' }}>
              Informations mises à jour ✓
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button
              onClick={handleSaveInfo}
              disabled={!isDirty || infoSaving}
              style={{
                background: isDirty && !infoSaving ? 'white' : 'rgba(255,255,255,0.3)',
                color: '#3d6124',
                border: 'none',
                borderRadius: '999px',
                padding: '0.6rem 1.5rem',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: isDirty && !infoSaving ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s',
              }}
            >
              {infoSaving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>

        {/* US-42 — Code d'invitation */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Code d'invitation</h2>
          <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Régénérer invalide immédiatement l'ancien code. Les membres déjà présents ne sont pas affectés.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: '2rem',
                letterSpacing: '0.4em',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '0.5rem 1rem',
              }}
            >
              {inviteCode}
            </span>
            <button
              onClick={handleCopy}
              style={{
                background: copied ? 'rgba(142,196,80,0.2)' : 'transparent',
                border: `1px solid ${copied ? '#8ec450' : 'rgba(255,255,255,0.4)'}`,
                color: copied ? '#8ec450' : 'white',
                borderRadius: '999px',
                padding: '0.5rem 1.1rem',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {copied ? '✓ Copié' : 'Copier'}
            </button>
          </div>

          {regenError && (
            <p style={{ color: '#e24b4a', fontSize: '0.9rem', marginBottom: '0.75rem' }}>{regenError}</p>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                disabled={regenerating}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.4)',
                  color: 'white',
                  borderRadius: '999px',
                  padding: '0.6rem 1.3rem',
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: regenerating ? 'not-allowed' : 'pointer',
                  opacity: regenerating ? 0.6 : 1,
                }}
              >
                {regenerating ? 'Régénération…' : '↻ Régénérer le code'}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Régénérer le code d'invitation ?</AlertDialogTitle>
                <AlertDialogDescription>
                  L'ancien code sera immédiatement invalide. Les membres déjà présents ne sont pas affectés.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleRegenerate}>Confirmer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* US-39 — Transfert admin (structure identique à l'original) */}
        {transferSuccess ? (
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>✅ Rôle admin transféré.</p>
            <p style={{ opacity: 0.7 }}>Redirection en cours…</p>
          </div>
        ) : (
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Transmettre le rôle admin</h2>
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

                {transferError && (
                  <p style={{ color: '#e24b4a', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    {transferError}
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