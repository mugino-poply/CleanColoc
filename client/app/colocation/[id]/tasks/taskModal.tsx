'use client';

import { useState } from 'react';

interface TaskTemplate {
  id: string;
  description: string | null;
  dueDate: string | null;
  isRecurring: boolean;
  recurringInterval: string | null;
  weight: number;
}

interface Assignment {
  id: string;
  taskId: string;
  userId: string;
  taskTitleSnapshot: string;
  task: TaskTemplate;
}

interface Member {
  membershipId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: 'admin' | 'member';
  joinedAt: string;
}

interface TaskModalProps {
  assignment: Assignment | null;
  members: Member[];
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    dueDate: string;
    userId: string | null;
  }) => Promise<void>;
}

export default function TaskModal({ assignment, members, onClose, onSubmit }: TaskModalProps) {
  const [title, setTitle] = useState(assignment?.taskTitleSnapshot ?? '');
  const [description, setDescription] = useState(assignment?.task?.description ?? '');
  const [dueDate, setDueDate] = useState(
    assignment?.task?.dueDate ? assignment.task.dueDate.slice(0, 10) : ''
  );
  const [userId, setUserId] = useState<string | null>(assignment?.userId ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Le titre est obligatoire.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ title: title.trim(), description, dueDate, userId });
    } catch {
      setError('Une erreur est survenue.');
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
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
      }}>
        <h2 style={{
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: '2rem',
          color: '#fff',
          letterSpacing: '0.05em',
          margin: '0 0 1.5rem',
        }}>
          {assignment ? 'Modifier la tâche' : 'Nouvelle tâche'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Titre *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Passer l'aspirateur"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails optionnels…"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={labelStyle}>Date d'échéance</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ ...inputStyle, colorScheme: 'dark' }}
            />
          </div>

          <div>
            <label style={labelStyle}>Assigner à</label>
            <select
              value={userId ?? ''}
              onChange={(e) => setUserId(e.target.value || null)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">Non assigné</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>{m.username}</option>
              ))}
            </select>
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
              {submitting ? 'Enregistrement…' : assignment ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}