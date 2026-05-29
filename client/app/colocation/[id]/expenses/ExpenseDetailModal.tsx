'use client';

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

interface ExpenseDetailModalProps {
  expense: Expense;
  myUserId: string | null;
  onClose: () => void;
}

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export default function ExpenseDetailModal({ expense, myUserId, onClose }: ExpenseDetailModalProps) {
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
        maxWidth: 440,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <h2 style={{
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: '2rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: 0,
              lineHeight: 1,
            }}>
              {expense.title}
            </h2>
            <span style={{
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: '2rem',
              color: '#fff',
              letterSpacing: '0.05em',
              flexShrink: 0,
            }}>
              {fmt(expense.amount)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.15rem 0.6rem',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.8)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {expense.category}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
              📅 {new Date(expense.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Payeur */}
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>💳 Payé par</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
            {expense.payerId === myUserId ? 'Moi' : expense.payerSnapshot}
          </span>
        </div>

        {/* Description */}
        {expense.description && (
          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            lineHeight: 1.5,
          }}>
            {expense.description}
          </p>
        )}

        {/* Répartition */}
        <div>
          <p style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: '0 0 0.5rem',
          }}>
            Répartition
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {expense.shares.map(share => (
              <div key={share.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.6rem 1rem',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 12,
              }}>
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

        {/* Fermer */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: '1.5rem',
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
    </div>
  );
}