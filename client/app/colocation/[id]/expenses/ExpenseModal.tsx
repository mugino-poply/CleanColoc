'use client';

import { useState } from 'react';

interface Member {
  membershipId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: 'admin' | 'member';
  joinedAt: string;
}

interface ExpenseModalProps {
  members: Member[];
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    amount: number;
    category: string;
    description: string;
    date: string;
    memberIds: string[];
  }) => Promise<void>;
}

export default function ExpenseModal({ members, onClose, onSubmit }: ExpenseModalProps) {
  const today = new Date().toISOString().split('T')[0]!;
  const [title, setTitle] = useState('');
  const [amountEuros, setAmountEuros] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    members.map(m => m.userId)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleMember = (userId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Le titre est obligatoire.'); return; }
    const parsed = parseFloat(amountEuros.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) { setError('Le montant doit être un nombre positif.'); return; }
    if (!category.trim()) { setError('La catégorie est obligatoire.'); return; }
    if (selectedMemberIds.length === 0) { setError('Sélectionne au moins un membre.'); return; }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        amount: Math.round(parsed * 100),
        category: category.trim(),
        description,
        date: date || today,
        memberIds: selectedMemberIds,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.12)',
    border: 'none',
    borderRadius: 12,
    padding: '0.75rem 1rem',
    color: '#fff',
    fontSize: '0.95rem',
    fontFamily: 'DM Sans, sans-serif',
    boxSizing: 'border-box' as const,
    outline: 'none',
  };

  const labelStyle = {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.4rem',
    display: 'block',
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div style={{
        background: 'linear-gradient(135deg, rgba(74,122,46,0.97), rgba(61,97,36,0.99))',
        borderRadius: 24,
        padding: '2rem',
        width: '100%',
        maxWidth: 480,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <h2 style={{
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: '2rem',
          color: '#fff',
          letterSpacing: '0.05em',
          margin: '0 0 1.5rem',
        }}>
          Nouvelle dépense
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Titre *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex : Courses Carrefour"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Montant (€) *</label>
              <input
                value={amountEuros}
                onChange={e => setAmountEuros(e.target.value)}
                placeholder="Ex : 42,50"
                style={inputStyle}
                inputMode="decimal"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{ ...inputStyle, colorScheme: 'dark' }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Catégorie *</label>
            <input
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="Ex : courses, loyer, électricité…"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Détails optionnels…"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={labelStyle}>Membres concernés *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {members.map(m => (
                <label key={m.userId} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem 1rem',
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: '0.9rem',
                }}>
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(m.userId)}
                    onChange={() => toggleMember(m.userId)}
                    style={{ accentColor: '#8ec450', width: 16, height: 16 }}
                  />
                  {m.username}
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p style={{ color: '#e24b4a', fontSize: '0.875rem', margin: 0 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.4)',
                color: '#fff',
                borderRadius: 999,
                padding: '0.75rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                flex: 1,
                background: '#fff',
                color: '#3d6124',
                border: 'none',
                borderRadius: 999,
                padding: '0.75rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontFamily: 'DM Sans, sans-serif',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Enregistrement…' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}