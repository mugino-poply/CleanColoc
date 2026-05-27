'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import TaskModal from './taskModal';
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
} from '@/components/ui/alert-dialog';

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
  colocationId: string;
  periodStart: string;
  periodEnd: string;
  status: 'à faire' | 'terminée' | 'manquée';
  completedAt: string | null;
  taskTitleSnapshot: string;
  taskWeightSnapshot: number;
  generationMethod: 'auto' | 'manual';
  transferredFromUserId: string | null;
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

export default function TasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { accessToken, isAuthenticated } = useAuth();
  const router = useRouter();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [filterUser, setFilterUser] = useState<'me' | 'all'>('me');
  const [filterPeriod, setFilterPeriod] = useState<'current' | 'next' | 'past' | 'all'>('current');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  // Fetch déclenché par les filtres
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const qs = new URLSearchParams();
    if (filterUser === 'me') qs.set('userId', 'me');
    qs.set('period', filterPeriod);
    if (filterStatus) qs.set('status', filterStatus);

    setLoading(true);
    setError(null);
    apiFetch(`/api/colocations/${id}/assignments?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        return res.json();
      })
      .then((data: Assignment[]) => setAssignments(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, filterUser, filterPeriod, filterStatus, accessToken, isAuthenticated]);

  // Fetch membres
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    apiFetch(`/api/colocations/${id}/members`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json())
      .then((data: Member[]) => setMembers(data));
  }, [id, accessToken, isAuthenticated]);

  // Refresh manuel post-action
  const refreshAssignments = () => {
    const qs = new URLSearchParams();
    if (filterUser === 'me') qs.set('userId', 'me');
    qs.set('period', filterPeriod);
    if (filterStatus) qs.set('status', filterStatus);

    setLoading(true);
    setError(null);
    apiFetch(`/api/colocations/${id}/assignments?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        return res.json();
      })
      .then((data: Assignment[]) => setAssignments(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleRegenerate = async (period: 'current' | 'next') => {
    setRegenerating(true);
    try {
      await apiFetch(`/api/colocations/${id}/assignments/regenerate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ period }),
      });
      refreshAssignments();
    } catch (err) {
      console.error('Erreur régénération :', err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleComplete = async (assignment: Assignment) => {
    await apiFetch(`/api/assignments/${assignment.id}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    refreshAssignments();
  };

  const handleDelete = async (assignment: Assignment) => {
    if (!window.confirm(`Supprimer la tâche "${assignment.taskTitleSnapshot}" ?`)) return;
    await apiFetch(`/api/tasks/${assignment.taskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    refreshAssignments();
  };

  const handleModalSubmit = async (data: {
    title: string;
    description: string;
    dueDate: string;
    userId: string | null;
  }) => {
    const jsonHeaders = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    if (editingAssignment) {
      await apiFetch(`/api/tasks/${editingAssignment.taskId}`, {
        method: 'PATCH',
        headers: jsonHeaders,
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          dueDate: data.dueDate || null,
        }),
      });
      if (data.userId !== editingAssignment.userId) {
        await apiFetch(`/api/assignments/${editingAssignment.id}/assign`, {
          method: 'PATCH',
          headers: jsonHeaders,
          body: JSON.stringify({ userId: data.userId }),
        });
      }
    } else {
      const res = await apiFetch(`/api/colocations/${id}/tasks`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          dueDate: data.dueDate || null,
          isRecurring: false,
        }),
      });
      if (res.ok && data.userId) {
        const created: { task: { id: string }; assignment: { id: string } } = await res.json();
        await apiFetch(`/api/assignments/${created.assignment.id}/assign`, {
          method: 'PATCH',
          headers: jsonHeaders,
          body: JSON.stringify({ userId: data.userId }),
        });
      }
    }

    setModalOpen(false);
    setEditingAssignment(null);
    refreshAssignments();
  };

  const getMember = (userId: string | null) =>
    userId ? (members.find((m) => m.userId === userId) ?? null) : null;

  const isOverdue = (dueDate: string | null, status: string) =>
    status === 'à faire' && !!dueDate && new Date(dueDate) < new Date();

  const statusColor = (status: Assignment['status']) => {
    if (status === 'terminée') return '#8ec450';
    if (status === 'manquée') return '#e24b4a';
    return '#ef9f27';
  };

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    background: active ? '#fff' : 'transparent',
    color: active ? '#3d6124' : 'rgba(255,255,255,0.7)',
    border: 'none',
    borderRadius: 999,
    padding: '0.35rem 1rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: active ? 700 : 400,
    transition: 'all 0.2s',
  });

  return (
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #4a7a2e 0%, #3d6124 60%, #2a4318 100%)',
      padding: '2rem 1rem',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Ligne 1 : Retour + Engrenage */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
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
          <button
            onClick={() => router.push(`/colocation/${id}/tasks/settings`)}
            title="Paramètres"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '1.3rem',
              display: 'flex',
              alignItems: 'center',
              padding: 0,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          >
            ⚙
          </button>
        </div>

        {/* Ligne 2 : Régénérer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                disabled={regenerating}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'rgba(255,255,255,0.7)',
                  borderRadius: 999,
                  padding: '0.4rem 1.2rem',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                {regenerating ? 'Régénération…' : '↺ Régénérer les assignations'}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Régénérer les assignations</AlertDialogTitle>
                <AlertDialogDescription>
                  Les tâches déjà complétées ne seront pas affectées. Choisissez la période à régénérer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleRegenerate('current')}>
                  Période courante
                </AlertDialogAction>
                <AlertDialogAction onClick={() => handleRegenerate('next')}>
                  Période suivante
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Ligne 3 : Titre + Nouvelle tâche */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h1 style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: '3rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: 0,
          }}>
            Tâches
          </h1>
          <button
            onClick={() => { setEditingAssignment(null); setModalOpen(true); }}
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
            + Nouvelle tâche
          </button>
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: 999, padding: 4, alignSelf: 'flex-start' }}>
            {(['me', 'all'] as const).map((v) => (
              <button key={v} onClick={() => setFilterUser(v)} style={toggleStyle(filterUser === v)}>
                {v === 'me' ? 'Mes tâches' : 'Toute la coloc'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: 999, padding: 4, alignSelf: 'flex-start' }}>
            {(['current', 'next', 'past', 'all'] as const).map((v) => (
              <button key={v} onClick={() => setFilterPeriod(v)} style={toggleStyle(filterPeriod === v)}>
                {v === 'current' ? 'En cours' : v === 'next' ? 'Suivante' : v === 'past' ? 'Passée' : 'Tout'}
              </button>
            ))}
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              alignSelf: 'flex-start',
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              borderRadius: 999,
              padding: '0.4rem 1rem',
              color: '#fff',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <option value="">Tous les statuts</option>
            <option value="à faire">À faire</option>
            <option value="terminée">Terminée</option>
            <option value="manquée">Manquée</option>
          </select>
        </div>

        {loading && <p style={{ color: 'rgba(255,255,255,0.7)' }}>Chargement…</p>}
        {error && <p style={{ color: '#e24b4a' }}>{error}</p>}

        {!loading && !error && assignments.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: '4rem' }}>
            <p style={{ fontSize: '1.1rem' }}>Aucune tâche pour le moment.</p>
            <p style={{ fontSize: '0.9rem' }}>Crée la première !</p>
          </div>
        )}

        {!loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {assignments.map((assignment, i) => {
              const assignee = getMember(assignment.userId);
              const overdue = isOverdue(assignment.task?.dueDate ?? null, assignment.status);
              return (
                <div
                  key={assignment.id}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: 24,
                    padding: '1.25rem 1.5rem',
                    borderLeft: `4px solid ${statusColor(assignment.status)}`,
                    opacity: 0,
                    animation: 'fadeUp 0.4s ease forwards',
                    animationDelay: `${i * 0.06}s`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{
                          fontWeight: 700,
                          color: '#fff',
                          fontSize: '1rem',
                          textDecoration: assignment.status === 'terminée' ? 'line-through' : 'none',
                          opacity: assignment.status === 'terminée' ? 0.6 : 1,
                        }}>
                          {assignment.taskTitleSnapshot}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.6rem',
                          borderRadius: 999,
                          background: statusColor(assignment.status),
                          color: '#fff',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          flexShrink: 0,
                        }}>
                          {assignment.status}
                        </span>
                      </div>

                      {assignment.task?.description && (
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: '0 0 0.5rem' }}>
                          {assignment.task.description.length > 100
                            ? assignment.task.description.slice(0, 100) + '…'
                            : assignment.task.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ color: assignee ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>
                          👤 {assignee ? assignee.username : 'Non assigné'}
                        </span>
                        {assignment.task?.dueDate && (
                          <span style={{
                            color: overdue ? '#e24b4a' : 'rgba(255,255,255,0.6)',
                            fontSize: '0.8rem',
                            fontWeight: overdue ? 700 : 400,
                          }}>
                            📅 {new Date(assignment.task.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            {overdue && ' · En retard'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        onClick={() => handleComplete(assignment)}
                        title={assignment.status === 'terminée' ? 'Rouvrir' : 'Marquer comme terminée'}
                        style={{
                          background: 'rgba(255,255,255,0.15)',
                          border: 'none',
                          borderRadius: 999,
                          width: 36,
                          height: 36,
                          cursor: 'pointer',
                          fontSize: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                        }}
                      >
                        {assignment.status === 'terminée' ? '↩' : '✓'}
                      </button>
                      <button
                        onClick={() => { setEditingAssignment(assignment); setModalOpen(true); }}
                        title="Modifier"
                        style={{
                          background: 'rgba(255,255,255,0.15)',
                          border: 'none',
                          borderRadius: 999,
                          width: 36,
                          height: 36,
                          cursor: 'pointer',
                          fontSize: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                        }}
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDelete(assignment)}
                        title="Supprimer"
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: 'none',
                          borderRadius: 999,
                          width: 36,
                          height: 36,
                          cursor: 'pointer',
                          fontSize: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#e24b4a',
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {modalOpen && (
        <TaskModal
          assignment={editingAssignment}
          members={members}
          onClose={() => { setModalOpen(false); setEditingAssignment(null); }}
          onSubmit={handleModalSubmit}
        />
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        select option { background: #3d6124; color: #fff; }
      `}</style>
    </main>
  );
}