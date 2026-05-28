'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatrixRow {
  userId: string;
  taskId: string;
  taskTitle: string;
  username: string;
  avatarUrl: string | null;
  total: number;
  completed: number;
  pending: number;
}

interface MemberTotal {
  userId: string;
  username: string;
  avatarUrl: string | null;
  total: number;
  completed: number;
}

interface TaskTotal {
  taskId: string;
  taskTitle: string;
  total: number;
  completed: number;
}

interface AssignmentStats {
  period: { from: string | null; to: string | null };
  matrix: MatrixRow[];
  memberTotals: MemberTotal[];
  taskTotals: TaskTotal[];
  mostLoaded: MemberTotal | null;
  leastLoaded: MemberTotal | null;
}

type Preset = 'all' | 'week' | 'month' | 'custom';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPresetDates(preset: Preset): { from: string | null; to: string | null } {
  if (preset === 'all' || preset === 'custom') return { from: null, to: null };

  const now = new Date();

  if (preset === 'week') {
    const monday = new Date(now);
    const day = monday.getDay() || 7;
    monday.setDate(monday.getDate() - day + 1);
    return { from: monday.toISOString().slice(0, 10), to: null };
  }

  // month
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: firstOfMonth.toISOString().slice(0, 10), to: null };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: colocationId } = use(params);
  const { accessToken } = useAuth();

  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [preset, setPreset] = useState<Preset>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const activeDates = useMemo(() => {
    if (preset === 'custom') {
      return { from: customFrom || null, to: customTo || null };
    }
    return getPresetDates(preset);
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    if (!accessToken) return;

    const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
        const qs = new URLSearchParams();
        if (activeDates.from) qs.set('from', activeDates.from);
        if (activeDates.to) qs.set('to', activeDates.to);
        const query = qs.toString() ? `?${qs.toString()}` : '';

        const res = await apiFetch(
        `/api/colocations/${colocationId}/assignments/stats${query}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message ?? `Erreur ${res.status}`);
        }

        const data: AssignmentStats = await res.json();
        setStats(data);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
        setLoading(false);
    }
    };

    fetchStats();
  }, [accessToken, colocationId, activeDates]);

  // Pivot : memberMap[userId][taskId] = { completed, total }
  const pivot = useMemo(() => {
    const map = new Map<string, Map<string, { completed: number; total: number }>>();
    if (!stats) return map;
    for (const row of stats.matrix) {
      if (!map.has(row.userId)) map.set(row.userId, new Map());
      map.get(row.userId)!.set(row.taskId, {
        completed: row.completed,
        total: row.total,
      });
    }
    return map;
  }, [stats]);

  const grandTotalCompleted =
    stats?.memberTotals.reduce((s, m) => s + m.completed, 0) ?? 0;
  const grandTotalAll =
    stats?.memberTotals.reduce((s, m) => s + m.total, 0) ?? 0;

  // ─── Rendu ────────────────────────────────────────────────────────────────

  const PRESETS: { key: Preset; label: string }[] = [
    { key: 'all', label: 'Depuis le début' },
    { key: 'week', label: 'Cette semaine' },
    { key: 'month', label: 'Ce mois' },
    { key: 'custom', label: 'Personnalisé' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at top, #4a7a2c 0%, #3d6124 100%)',
        padding: '2rem 1.25rem',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <Link
            href={`/colocation/${colocationId}/tasks`}
            style={{
              color: 'rgba(255,255,255,0.6)',
              textDecoration: 'none',
              fontSize: 13,
              display: 'inline-block',
              marginBottom: '0.75rem',
            }}
          >
            ← Retour
          </Link>
          <h1
            style={{
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: '2.75rem',
              color: '#fff',
              letterSpacing: 3,
              margin: 0,
              lineHeight: 1,
            }}
          >
            Historique des assignations
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: '0.4rem' }}>
            Répartition des tâches par membre sur la période sélectionnée.
          </p>
        </div>

        {/* Filtres */}
        <div
          style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
            borderRadius: 16,
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            alignItems: 'center',
          }}
        >
          {PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              style={{
                padding: '0.4rem 1.1rem',
                borderRadius: 999,
                border:
                  preset === key
                    ? 'none'
                    : '1.5px solid rgba(255,255,255,0.4)',
                background: preset === key ? '#fff' : 'transparent',
                color: preset === key ? '#3d6124' : '#fff',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}

          {preset === 'custom' && (
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                marginLeft: '0.25rem',
              }}
            >
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  padding: '0.35rem 0.75rem',
                  color: '#fff',
                  fontSize: 13,
                  fontFamily: 'DM Sans, sans-serif',
                }}
              />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  padding: '0.35rem 0.75rem',
                  color: '#fff',
                  fontSize: 13,
                  fontFamily: 'DM Sans, sans-serif',
                }}
              />
            </div>
          )}
        </div>

        {/* Badges de charge */}
        {stats && (stats.mostLoaded || stats.leastLoaded) && (
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
            }}
          >
            {stats.mostLoaded && (
              <LoadBadge
                label="Plus chargé"
                member={stats.mostLoaded}
                accentColor="#8ec450"
              />
            )}
            {stats.leastLoaded &&
              stats.mostLoaded &&
              stats.leastLoaded.userId !== stats.mostLoaded.userId && (
                <LoadBadge
                  label="Moins chargé"
                  member={stats.leastLoaded}
                  accentColor="#ef9f27"
                />
              )}
          </div>
        )}

        {/* Tableau */}
        <div
          style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
            borderRadius: 24,
            padding: '1.5rem',
            overflowX: 'auto',
          }}
        >
          {loading && (
            <p
              style={{
                color: 'rgba(255,255,255,0.6)',
                textAlign: 'center',
                padding: '3rem 0',
              }}
            >
              Chargement…
            </p>
          )}

          {!loading && error && (
            <p
              style={{
                color: '#e24b4a',
                textAlign: 'center',
                padding: '3rem 0',
              }}
            >
              {error}
            </p>
          )}

          {!loading && !error && stats && stats.memberTotals.length === 0 && (
            <p
              style={{
                color: 'rgba(255,255,255,0.5)',
                textAlign: 'center',
                padding: '3rem 0',
                fontSize: 15,
              }}
            >
              Aucune assignation sur cette période.
            </p>
          )}

          {!loading && !error && stats && stats.memberTotals.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}
                >
                  <TableHead
                    style={{
                      color: 'rgba(255,255,255,0.6)',
                      fontFamily: 'Bebas Neue, sans-serif',
                      fontSize: 14,
                      letterSpacing: 1.5,
                      minWidth: 120,
                    }}
                  >
                    Membre
                  </TableHead>
                  {stats.taskTotals.map((task) => (
                    <TableHead
                      key={task.taskId}
                      style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontFamily: 'Bebas Neue, sans-serif',
                        fontSize: 14,
                        letterSpacing: 1.5,
                        textAlign: 'center',
                        minWidth: 110,
                      }}
                    >
                      {task.taskTitle}
                    </TableHead>
                  ))}
                  <TableHead
                    style={{
                      color: '#fff',
                      fontFamily: 'Bebas Neue, sans-serif',
                      fontSize: 14,
                      letterSpacing: 1.5,
                      textAlign: 'center',
                      minWidth: 90,
                    }}
                  >
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {stats.memberTotals.map((member) => (
                  <TableRow
                    key={member.userId}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <TableCell
                      style={{ color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                      {member.username}
                    </TableCell>

                    {stats.taskTotals.map((task) => {
                      const cell = pivot.get(member.userId)?.get(task.taskId);
                      return (
                        <TableCell key={task.taskId} style={{ textAlign: 'center' }}>
                          {cell ? (
                            <CellDisplay
                              completed={cell.completed}
                              total={cell.total}
                            />
                          ) : (
                            <span
                              style={{
                                color: 'rgba(255,255,255,0.2)',
                                fontSize: 13,
                              }}
                            >
                              —
                            </span>
                          )}
                        </TableCell>
                      );
                    })}

                    <TableCell style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontFamily: 'Bebas Neue, sans-serif',
                          fontSize: 18,
                          color: '#8ec450',
                          letterSpacing: 1,
                        }}
                      >
                        {member.completed}
                        <span
                          style={{
                            color: 'rgba(255,255,255,0.35)',
                            fontSize: 12,
                            fontFamily: 'DM Sans, sans-serif',
                            fontWeight: 400,
                            letterSpacing: 0,
                          }}
                        >
                          /{member.total}
                        </span>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Ligne de totaux par tâche */}
                <TableRow
                  style={{ borderTop: '2px solid rgba(255,255,255,0.25)' }}
                >
                  <TableCell
                    style={{
                      color: 'rgba(255,255,255,0.55)',
                      fontFamily: 'Bebas Neue, sans-serif',
                      fontSize: 13,
                      letterSpacing: 1.5,
                    }}
                  >
                    Total tâche
                  </TableCell>
                  {stats.taskTotals.map((task) => (
                    <TableCell
                      key={task.taskId}
                      style={{
                        textAlign: 'center',
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {task.completed}
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>
                        /{task.total}
                      </span>
                    </TableCell>
                  ))}
                  <TableCell style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontFamily: 'Bebas Neue, sans-serif',
                        fontSize: 18,
                        color: '#fff',
                        letterSpacing: 1,
                      }}
                    >
                      {grandTotalCompleted}
                      <span
                        style={{
                          color: 'rgba(255,255,255,0.35)',
                          fontSize: 12,
                          fontFamily: 'DM Sans, sans-serif',
                          fontWeight: 400,
                          letterSpacing: 0,
                        }}
                      >
                        /{grandTotalAll}
                      </span>
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>

        {/* Légende */}
        {!loading && stats && stats.memberTotals.length > 0 && (
          <p
            style={{
              color: 'rgba(255,255,255,0.35)',
              fontSize: 11,
              marginTop: '0.6rem',
              textAlign: 'right',
            }}
          >
            Format cellule : terminées / total assignations
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function CellDisplay({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const ratio = total > 0 ? completed / total : 0;
  const color =
    ratio >= 0.8 ? '#8ec450' : ratio >= 0.5 ? '#ef9f27' : '#e24b4a';
  return (
    <span style={{ fontWeight: 700, color, fontSize: 15 }}>
      {completed}
      <span
        style={{
          color: 'rgba(255,255,255,0.35)',
          fontWeight: 400,
          fontSize: 12,
        }}
      >
        /{total}
      </span>
    </span>
  );
}

function LoadBadge({
  label,
  member,
  accentColor,
}: {
  label: string;
  member: MemberTotal;
  accentColor: string;
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
        borderRadius: 12,
        padding: '0.65rem 1.1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: accentColor,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      <div>
        <div
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
          {member.username}
          <span
            style={{
              color: 'rgba(255,255,255,0.45)',
              fontWeight: 400,
              fontSize: 12,
              marginLeft: 6,
            }}
          >
            {member.completed} terminée{member.completed > 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}