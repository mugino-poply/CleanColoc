'use client';

import { useEffect, useState, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import ExpenseModal from './ExpenseModal';
import ExpenseDetailModal from './ExpenseDetailModal';

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

interface Balance {
  userId: string;
  username: string;
  avatarUrl: string | null;
  net: number;
}

interface Debt {
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  toUsername: string;
  amount: number;
}

interface Member {
  membershipId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: 'admin' | 'member';
  joinedAt: string;
}

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export default function ExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { accessToken, isAuthenticated } = useAuth();
  const router = useRouter();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // US-22 — filtres client-side
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const myUserId = accessToken
    ? (() => { try { return JSON.parse(atob(accessToken.split('.')[1]!)).id as string; } catch { return null; } })()
    : null;

  // Rôle de l'utilisateur courant dans la colocation
  const myRole = members.find((m) => m.userId === myUserId)?.role ?? null;

  // Catégories disponibles (déduplication)
  const availableCategories = useMemo(() => {
    const set = new Set(expenses.map((e) => e.category));
    return Array.from(set).sort();
  }, [expenses]);

  // Dépenses filtrées (client-side)
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (filterFrom && e.date < filterFrom) return false;
      if (filterTo && e.date > filterTo) return false;
      if (filterCategory && e.category !== filterCategory) return false;
      return true;
    });
  }, [expenses, filterFrom, filterTo, filterCategory]);

  const filteredTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const hasActiveFilters = filterFrom !== '' || filterTo !== '' || filterCategory !== '';

  const fetchAll = () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch(`/api/colocations/${id}/expenses`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(res => { if (!res.ok) throw new Error(`Erreur ${res.status}`); return res.json() as Promise<Expense[]>; }),
      apiFetch(`/api/colocations/${id}/balances`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(res => { if (!res.ok) throw new Error(`Erreur ${res.status}`); return res.json() as Promise<{ balances: Balance[]; debts: Debt[] }>; }),
      apiFetch(`/api/colocations/${id}/members`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(res => res.json() as Promise<Member[]>),
    ])
      .then(([expensesData, balancesData, membersData]) => {
        setExpenses(expensesData);
        setBalances(balancesData.balances);
        setDebts(balancesData.debts);
        setMembers(membersData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    fetchAll();
  }, [id, accessToken, isAuthenticated]);

  const handleCreateExpense = async (data: {
    title: string;
    amount: number;
    category: string;
    description: string;
    date: string;
    memberIds: string[];
  }) => {
    const res = await apiFetch(`/api/colocations/${id}/expenses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.message ?? `Erreur ${res.status}`);
    }
    setModalOpen(false);
    fetchAll();
  };

  // US-23 — appelé par ExpenseDetailModal après update ou delete
  const handleExpenseSaved = () => {
    setSelectedExpense(null);
    fetchAll();
  };

  const allBalanced = balances.length === 0 || balances.every(b => b.net === 0);

  const resetFilters = () => {
    setFilterFrom('');
    setFilterTo('');
    setFilterCategory('');
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #4a7a2e 0%, #3d6124 60%, #2a4318 100%)',
      padding: '2rem 1rem',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Retour */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={() => router.push(`/colocation/${id}`)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.4)',
              color: '#fff',
              borderRadius: 999,
              padding: '0.4rem 1.2rem',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            ← Retour
          </button>
        </div>

        {/* Titre + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <h1 style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: '3rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: 0,
          }}>
            Dépenses
          </h1>
          <button
            onClick={() => setModalOpen(true)}
            style={{
              background: '#fff',
              color: '#3d6124',
              border: 'none',
              borderRadius: 999,
              padding: '0.6rem 1.4rem',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.95rem',
            }}
          >
            + Nouvelle dépense
          </button>
        </div>

        {loading && <p style={{ color: 'rgba(255,255,255,0.7)' }}>Chargement…</p>}
        {error && <p style={{ color: '#e24b4a' }}>{error}</p>}

        {!loading && !error && (
          <>
            {/* Section soldes */}
            <section style={{ marginBottom: '2.5rem' }}>
              <h2 style={{
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: '1.6rem',
                color: '#fff',
                letterSpacing: '0.05em',
                marginBottom: '1rem',
              }}>
                Mes soldes
              </h2>

              {allBalanced ? (
                <div style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: 16,
                  padding: '1rem 1.5rem',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                }}>
                  Tout est équilibré ✓
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {balances.map(b => (
                      <div key={b.userId} style={{
                        background: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: 16,
                        padding: '0.75rem 1.25rem',
                        borderLeft: `3px solid ${b.net > 0 ? '#8ec450' : b.net < 0 ? '#e24b4a' : 'rgba(255,255,255,0.2)'}`,
                      }}>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginBottom: 2 }}>
                          {b.userId === myUserId ? 'Moi' : b.username}
                        </div>
                        <div style={{
                          fontWeight: 700,
                          fontSize: '1.1rem',
                          color: b.net > 0 ? '#8ec450' : b.net < 0 ? '#e24b4a' : '#fff',
                        }}>
                          {b.net >= 0 ? '+' : ''}{fmt(b.net)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {debts.length > 0 && (
                    <div style={{
                      background: 'rgba(255,255,255,0.07)',
                      borderRadius: 16,
                      padding: '1rem 1.25rem',
                    }}>
                      <p style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        margin: '0 0 0.5rem',
                      }}>
                        Remboursements à faire
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {debts.map((d, i) => (
                          <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#fff',
                            fontSize: '0.9rem',
                          }}>
                            <span style={{ fontWeight: 700 }}>
                              {d.fromUserId === myUserId ? 'Moi' : d.fromUsername}
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.4)' }}>→</span>
                            <span>{d.toUserId === myUserId ? 'Moi' : d.toUsername}</span>
                            <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#ef9f27' }}>
                              {fmt(d.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Liste des dépenses */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 style={{
                  fontFamily: 'Bebas Neue, sans-serif',
                  fontSize: '1.6rem',
                  color: '#fff',
                  letterSpacing: '0.05em',
                  margin: 0,
                }}>
                  Toutes les dépenses
                </h2>
                {hasActiveFilters && (
                  <span style={{
                    fontFamily: 'Bebas Neue, sans-serif',
                    fontSize: '1.1rem',
                    color: '#ef9f27',
                    letterSpacing: '0.04em',
                  }}>
                    Total : {fmt(filteredTotal)}
                  </span>
                )}
              </div>

              {/* US-22 — Barre de filtres */}
              {expenses.length > 0 && (
                <div style={{
                  background: 'rgba(255,255,255,0.07)',
                  borderRadius: 16,
                  padding: '1rem 1.25rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  alignItems: 'flex-end',
                }}>
                  {/* Du */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Du
                    </label>
                    <input
                      type="date"
                      value={filterFrom}
                      onChange={e => setFilterFrom(e.target.value)}
                      style={{
                        background: 'rgba(255,255,255,0.12)',
                        border: 'none',
                        borderRadius: 12,
                        padding: '0.45rem 0.75rem',
                        color: '#fff',
                        fontSize: '0.85rem',
                        fontFamily: 'DM Sans, sans-serif',
                        colorScheme: 'dark',
                      }}
                    />
                  </div>

                  {/* Au */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Au
                    </label>
                    <input
                      type="date"
                      value={filterTo}
                      onChange={e => setFilterTo(e.target.value)}
                      style={{
                        background: 'rgba(255,255,255,0.12)',
                        border: 'none',
                        borderRadius: 12,
                        padding: '0.45rem 0.75rem',
                        color: '#fff',
                        fontSize: '0.85rem',
                        fontFamily: 'DM Sans, sans-serif',
                        colorScheme: 'dark',
                      }}
                    />
                  </div>

                  {/* Catégorie */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Catégorie
                    </label>
                    <select
                      value={filterCategory}
                      onChange={e => setFilterCategory(e.target.value)}
                      style={{
                        background: 'rgba(255,255,255,0.12)',
                        border: 'none',
                        borderRadius: 12,
                        padding: '0.45rem 0.75rem',
                        color: filterCategory ? '#fff' : 'rgba(255,255,255,0.45)',
                        fontSize: '0.85rem',
                        fontFamily: 'DM Sans, sans-serif',
                        cursor: 'pointer',
                        minWidth: 120,
                      }}
                    >
                      <option value="" style={{ background: '#3d6124' }}>Toutes</option>
                      {availableCategories.map(cat => (
                        <option key={cat} value={cat} style={{ background: '#3d6124' }}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reset */}
                  {hasActiveFilters && (
                    <button
                      onClick={resetFilters}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: 'rgba(255,255,255,0.6)',
                        borderRadius: 999,
                        padding: '0.45rem 1rem',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontFamily: 'DM Sans, sans-serif',
                        marginTop: 'auto',
                      }}
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>
              )}

              {filteredExpenses.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: '2rem' }}>
                  {hasActiveFilters ? (
                    <p style={{ fontSize: '1rem' }}>Aucune dépense ne correspond aux filtres.</p>
                  ) : (
                    <>
                      <p style={{ fontSize: '1.1rem' }}>Aucune dépense pour le moment.</p>
                      <p style={{ fontSize: '0.9rem' }}>Ajoutez la première !</p>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {filteredExpenses.map((expense, i) => (
                    <div
                      key={expense.id}
                      onClick={() => setSelectedExpense(expense)}
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: 24,
                        padding: '1.25rem 1.5rem',
                        cursor: 'pointer',
                        opacity: 0,
                        animation: 'fadeUp 0.4s ease forwards',
                        animationDelay: `${i * 0.06}s`,
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.16)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>
                            {expense.title}
                          </span>
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
                        </div>
                        <span style={{
                          fontFamily: 'Bebas Neue, sans-serif',
                          fontSize: '1.4rem',
                          color: '#fff',
                          letterSpacing: '0.05em',
                          flexShrink: 0,
                        }}>
                          {fmt(expense.amount)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                          💳 {expense.payerId === myUserId ? 'Moi' : expense.payerSnapshot}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                          📅 {new Date(expense.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>
                          👥 {expense.shares.length} membre{expense.shares.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {modalOpen && (
        <ExpenseModal
          members={members}
          onClose={() => setModalOpen(false)}
          onSubmit={handleCreateExpense}
        />
      )}

      {selectedExpense && (
        <ExpenseDetailModal
          expense={selectedExpense}
          myUserId={myUserId}
          myRole={myRole}
          availableCategories={availableCategories}
          members={members}
          accessToken={accessToken}
          onClose={() => setSelectedExpense(null)}
          onSaved={handleExpenseSaved}
        />
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}