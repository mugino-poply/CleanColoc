'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

interface ExpenseShare {
  id: string;
  userId: string | null;
  userSnapshot: string;
  amount: number;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  description: string | null;
  date: string;
  payerId: string | null;
  payerSnapshot: string;
  createdAt: string;
  shares: ExpenseShare[];
}

interface Member {
  membershipId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: 'admin' | 'member';
  joinedAt: string;
}

interface ExpenseDetailModalProps {
  expense: Expense;
  myUserId: string | null;
  myRole: 'admin' | 'member' | null;
  availableCategories: string[];
  members: Member[];
  accessToken: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export default function ExpenseDetailModal({
  expense,
  myUserId,
  myRole,
  availableCategories,
  members,
  accessToken,
  onClose,
  onSaved,
}: ExpenseDetailModalProps) {
  const canEdit = expense.payerId === myUserId || myRole === 'admin';

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [formTitle, setFormTitle] = useState(expense.title);
  const [formAmountEuros, setFormAmountEuros] = useState(
    (expense.amount / 100).toFixed(2).replace('.', ',')
  );
  const [formCategory, setFormCategory] = useState(expense.category);
  const [formDescription, setFormDescription] = useState(expense.description ?? '');
  const [formDate, setFormDate] = useState(expense.date);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    expense.shares.filter((s) => s.userId !== null).map((s) => s.userId as string)
  );

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const enterEditMode = () => {
    setFormTitle(expense.title);
    setFormAmountEuros((expense.amount / 100).toFixed(2).replace('.', ','));
    setFormCategory(expense.category);
    setFormDescription(expense.description ?? '');
    setFormDate(expense.date);
    setSelectedMemberIds(
      expense.shares.filter((s) => s.userId !== null).map((s) => s.userId as string)
    );
    setFormError(null);
    setConfirmDelete(false);
    setMode('edit');
  };

  const cancelEdit = () => {
    setMode('view');
    setFormError(null);
  };

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleUpdate = async () => {
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError('Le titre est obligatoire.');
      return;
    }

    const parsed = parseFloat(formAmountEuros.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      setFormError('Le montant doit être un nombre positif.');
      return;
    }
    const amountInCents = Math.round(parsed * 100);

    if (!formCategory.trim()) {
      setFormError('La catégorie est obligatoire.');
      return;
    }

    if (!formDate) {
      setFormError('La date est obligatoire.');
      return;
    }

    if (selectedMemberIds.length === 0) {
      setFormError('La dépense doit concerner au moins un membre.');
      return;
    }

    // N'envoyer memberIds que si la sélection a changé
    const currentMemberIds = expense.shares
      .filter((s) => s.userId !== null)
      .map((s) => s.userId as string)
      .sort();
    const membersChanged =
      JSON.stringify([...selectedMemberIds].sort()) !== JSON.stringify(currentMemberIds);

    const payload: Record<string, unknown> = {
      title: formTitle.trim(),
      amount: amountInCents,
      category: formCategory.trim(),
      description: formDescription.trim() || null,
      date: formDate,
    };
    if (membersChanged) payload.memberIds = selectedMemberIds;

    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/expenses/${expense.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        setFormError(body.message ?? `Erreur ${res.status}`);
        return;
      }

      onSaved();
    } catch {
      setFormError('Erreur réseau. Réessaie.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/expenses/${expense.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const body = await res.json();
        setFormError(body.message ?? `Erreur ${res.status}`);
        setConfirmDelete(false);
        return;
      }

      onSaved();
    } catch {
      setFormError('Erreur réseau. Réessaie.');
      setConfirmDelete(false);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.12)',
    border: 'none',
    borderRadius: 12,
    padding: '0.65rem 1rem',
    color: '#fff',
    fontSize: '0.9rem',
    fontFamily: 'DM Sans, sans-serif',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.25rem',
    display: 'block',
  };

  const indicativeShare = (() => {
    const parsed = parseFloat(formAmountEuros.replace(',', '.'));
    if (isNaN(parsed) || selectedMemberIds.length === 0) return 0;
    return Math.floor(Math.round(parsed * 100) / selectedMemberIds.length);
  })();

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
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(74,122,46,0.97), rgba(61,97,36,0.99))',
          borderRadius: 24,
          padding: '2rem',
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >

        {/* ===== MODE VUE ===== */}
        {mode === 'view' && (
          <>
            {/* Header : titre + montant */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <h2
                  style={{
                    fontFamily: 'Bebas Neue, sans-serif',
                    fontSize: '2rem',
                    color: '#fff',
                    letterSpacing: '0.05em',
                    margin: 0,
                    lineHeight: 1,
                  }}
                >
                  {expense.title}
                </h2>
                <span
                  style={{
                    fontFamily: 'Bebas Neue, sans-serif',
                    fontSize: '2rem',
                    color: '#fff',
                    letterSpacing: '0.05em',
                    flexShrink: 0,
                  }}
                >
                  {fmt(expense.amount)}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  marginTop: '0.5rem',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.6rem',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.15)',
                    color: 'rgba(255,255,255,0.8)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {expense.category}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                  📅 {new Date(expense.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Payeur */}
            <div
              style={{
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>💳 Payé par</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
                {expense.payerId === myUserId ? 'Moi' : expense.payerSnapshot}
              </span>
            </div>

            {/* Description */}
            {expense.description && (
              <p
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                  lineHeight: 1.5,
                }}
              >
                {expense.description}
              </p>
            )}

            {/* Répartition */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: '0 0 0.5rem',
                }}
              >
                Répartition
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {expense.shares.map(share => (
                  <div
                    key={share.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.6rem 1rem',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: 12,
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: '0.9rem' }}>
                      {share.userId === myUserId ? 'Moi' : share.userSnapshot}
                    </span>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
                      {fmt(share.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirmation de suppression */}
            {confirmDelete && (
              <div
                style={{
                  background: 'rgba(226,75,74,0.15)',
                  border: '1px solid rgba(226,75,74,0.4)',
                  borderRadius: 16,
                  padding: '1rem 1.25rem',
                  marginBottom: '1rem',
                }}
              >
                <p style={{ color: '#fff', fontSize: '0.9rem', margin: '0 0 0.75rem', fontWeight: 600 }}>
                  Supprimer cette dépense ?
                </p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: '0 0 1rem' }}>
                  Cette action est irréversible. Les soldes seront recalculés.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={handleDelete}
                    disabled={submitting}
                    style={{
                      flex: 1,
                      background: '#e24b4a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 999,
                      padding: '0.6rem',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      fontFamily: 'DM Sans, sans-serif',
                      opacity: submitting ? 0.6 : 1,
                    }}
                  >
                    {submitting ? 'Suppression…' : 'Oui, supprimer'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    disabled={submitting}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.4)',
                      borderRadius: 999,
                      padding: '0.6rem',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {canEdit && !confirmDelete && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={enterEditMode}
                    style={{
                      flex: 1,
                      background: '#fff',
                      color: '#3d6124',
                      border: 'none',
                      borderRadius: 999,
                      padding: '0.7rem',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    ✎ Modifier
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      color: '#e24b4a',
                      border: '1px solid rgba(226,75,74,0.5)',
                      borderRadius: 999,
                      padding: '0.7rem',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    🗑 Supprimer
                  </button>
                </div>
              )}
              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.4)',
                  color: '#fff',
                  borderRadius: 999,
                  padding: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.95rem',
                }}
              >
                Fermer
              </button>
            </div>
          </>
        )}

        {/* ===== MODE ÉDITION ===== */}
        {mode === 'edit' && (
          <>
            <h2
              style={{
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: '2rem',
                color: '#fff',
                letterSpacing: '0.05em',
                margin: '0 0 1.5rem',
              }}
            >
              Modifier la dépense
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Titre */}
              <div>
                <label style={labelStyle}>Titre *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  style={inputStyle}
                  placeholder="Ex : Courses Carrefour"
                />
              </div>

              {/* Montant */}
              <div>
                <label style={labelStyle}>Montant (€) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formAmountEuros}
                  onChange={e => setFormAmountEuros(e.target.value)}
                  style={inputStyle}
                  placeholder="Ex : 42,50"
                />
              </div>

              {/* Catégorie */}
              <div>
                <label style={labelStyle}>Catégorie *</label>
                <input
                  type="text"
                  list="categories-list"
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  style={inputStyle}
                  placeholder="Ex : courses, loyer…"
                />
                <datalist id="categories-list">
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description (optionnel)</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Détails supplémentaires…"
                />
              </div>

              {/* Date */}
              <div>
                <label style={labelStyle}>Date *</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </div>

              {/* Membres concernés */}
              <div>
                <label style={labelStyle}>
                  Membres concernés * ({selectedMemberIds.length}/{members.length})
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {members.map((member) => {
                    const isSelected = selectedMemberIds.includes(member.userId);
                    return (
                      <button
                        key={member.userId}
                        type="button"
                        onClick={() => toggleMember(member.userId)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.6rem 1rem',
                          background: isSelected
                            ? 'rgba(142,196,80,0.2)'
                            : 'rgba(255,255,255,0.07)',
                          border: isSelected
                            ? '1px solid rgba(142,196,80,0.5)'
                            : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 12,
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          transition: 'background 0.15s, border-color 0.15s',
                        }}
                      >
                        {/* Checkbox visuelle */}
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            border: isSelected
                              ? '2px solid #8ec450'
                              : '2px solid rgba(255,255,255,0.3)',
                            background: isSelected ? '#8ec450' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: '0.7rem',
                            color: '#fff',
                          }}
                        >
                          {isSelected ? '✓' : ''}
                        </span>

                        <span
                          style={{
                            color: '#fff',
                            fontSize: '0.9rem',
                            fontWeight: isSelected ? 600 : 400,
                          }}
                        >
                          {member.userId === myUserId
                            ? `${member.username} (moi)`
                            : member.username}
                        </span>

                        {isSelected && indicativeShare > 0 && (
                          <span
                            style={{
                              marginLeft: 'auto',
                              color: 'rgba(255,255,255,0.45)',
                              fontSize: '0.75rem',
                            }}
                          >
                            ~{fmt(indicativeShare)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p
                  style={{
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: '0.75rem',
                    margin: '0.35rem 0 0',
                  }}
                >
                  Le montant sera redistribué à parts égales entre les membres sélectionnés.
                </p>
              </div>
            </div>

            {/* Erreur */}
            {formError && (
              <p
                style={{
                  color: '#e24b4a',
                  fontSize: '0.85rem',
                  marginTop: '1rem',
                  padding: '0.6rem 1rem',
                  background: 'rgba(226,75,74,0.1)',
                  borderRadius: 10,
                }}
              >
                {formError}
              </p>
            )}

            {/* Boutons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={handleUpdate}
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
                  fontSize: '0.95rem',
                  fontFamily: 'DM Sans, sans-serif',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                onClick={cancelEdit}
                disabled={submitting}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.4)',
                  color: '#fff',
                  borderRadius: 999,
                  padding: '0.75rem',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.95rem',
                }}
              >
                Annuler
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}