'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import TaskModal from './taskModal';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'à faire' | 'terminée';
  assignedTo: string | null;
  colocationId: string;
  dueDate: string | null;
  completedAt: string | null;
  completedBy: string | null;
  createdAt: string;
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

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssignedTo, setFilterAssignedTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  const fetchTasks = () => {
    const qs = new URLSearchParams();
    if (filterStatus) qs.set('status', filterStatus);
    if (filterAssignedTo) qs.set('assignedTo', filterAssignedTo);
    const query = qs.toString() ? `?${qs.toString()}` : '';

    setLoading(true);
    apiFetch(`/api/colocations/${id}/tasks${query}`, { headers: authHeaders })
      .then((res) => {
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        return res.json();
      })
      .then((data: Task[]) => setTasks(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    apiFetch(`/api/colocations/${id}/members`, { headers: authHeaders })
      .then((res) => res.json())
      .then((data: Member[]) => setMembers(data));
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchTasks();
  }, [id, filterStatus, filterAssignedTo]);

  const handleComplete = async (task: Task) => {
    await apiFetch(`/api/tasks/${task.id}/complete`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    fetchTasks();
  };

  const handleDelete = async (task: Task) => {
    if (!window.confirm(`Supprimer la tâche "${task.title}" ?`)) return;
    await apiFetch(`/api/tasks/${task.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    fetchTasks();
  };

  const handleModalSubmit = async (data: {
    title: string;
    description: string;
    dueDate: string;
    assignedTo: string | null;
  }) => {
    const jsonHeaders = { ...authHeaders, 'Content-Type': 'application/json' };

    if (editingTask) {
      await apiFetch(`/api/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: jsonHeaders,
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          dueDate: data.dueDate || null,
        }),
      });
      if (data.assignedTo !== editingTask.assignedTo) {
        await apiFetch(`/api/tasks/${editingTask.id}/assign`, {
          method: 'PATCH',
          headers: jsonHeaders,
          body: JSON.stringify({ assignedTo: data.assignedTo }),
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
        }),
      });
      if (data.assignedTo && res.ok) {
        const created: Task = await res.json();
        await apiFetch(`/api/tasks/${created.id}/assign`, {
          method: 'PATCH',
          headers: jsonHeaders,
          body: JSON.stringify({ assignedTo: data.assignedTo }),
        });
      }
    }

    setModalOpen(false);
    setEditingTask(null);
    fetchTasks();
  };

  const getMember = (userId: string | null) =>
    userId ? (members.find((m) => m.userId === userId) ?? null) : null;

  const isOverdue = (dueDate: string | null, status: string) =>
    status === 'à faire' && !!dueDate && new Date(dueDate) < new Date();

  return (
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #4a7a2e 0%, #3d6124 60%, #2a4318 100%)',
      padding: '2rem 1rem',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

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
            marginBottom: '1.5rem',
          }}
        >
          ← Retour
        </button>

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
            onClick={() => { setEditingTask(null); setModalOpen(true); }}
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
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              borderRadius: 12,
              padding: '0.6rem 1rem',
              color: '#fff',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            <option value="">Tous les statuts</option>
            <option value="à faire">À faire</option>
            <option value="terminée">Terminées</option>
          </select>
          <select
            value={filterAssignedTo}
            onChange={(e) => setFilterAssignedTo(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              borderRadius: 12,
              padding: '0.6rem 1rem',
              color: '#fff',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            <option value="">Tous les membres</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>{m.username}</option>
            ))}
          </select>
        </div>

        {loading && <p style={{ color: 'rgba(255,255,255,0.7)' }}>Chargement…</p>}
        {error && <p style={{ color: '#e24b4a' }}>{error}</p>}

        {!loading && !error && tasks.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: '4rem' }}>
            <p style={{ fontSize: '1.1rem' }}>Aucune tâche pour le moment.</p>
            <p style={{ fontSize: '0.9rem' }}>Crée la première !</p>
          </div>
        )}

        {!loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {tasks.map((task, i) => {
              const assignee = getMember(task.assignedTo);
              const overdue = isOverdue(task.dueDate, task.status);
              return (
                <div
                  key={task.id}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: 24,
                    padding: '1.25rem 1.5rem',
                    borderLeft: `4px solid ${task.status === 'terminée' ? '#8ec450' : '#ef9f27'}`,
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
                          textDecoration: task.status === 'terminée' ? 'line-through' : 'none',
                          opacity: task.status === 'terminée' ? 0.6 : 1,
                        }}>
                          {task.title}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.6rem',
                          borderRadius: 999,
                          background: task.status === 'terminée' ? '#8ec450' : '#ef9f27',
                          color: '#fff',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          flexShrink: 0,
                        }}>
                          {task.status}
                        </span>
                      </div>

                      {task.description && (
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: '0 0 0.5rem' }}>
                          {task.description.length > 100
                            ? task.description.slice(0, 100) + '…'
                            : task.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ color: assignee ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>
                          👤 {assignee ? assignee.username : 'Non assigné'}
                        </span>
                        {task.dueDate && (
                          <span style={{
                            color: overdue ? '#e24b4a' : 'rgba(255,255,255,0.6)',
                            fontSize: '0.8rem',
                            fontWeight: overdue ? 700 : 400,
                          }}>
                            📅 {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            {overdue && ' · En retard'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        onClick={() => handleComplete(task)}
                        title={task.status === 'à faire' ? 'Marquer comme terminée' : 'Rouvrir'}
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
                        {task.status === 'à faire' ? '✓' : '↩'}
                      </button>
                      <button
                        onClick={() => { setEditingTask(task); setModalOpen(true); }}
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
                        onClick={() => handleDelete(task)}
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
          task={editingTask}
          members={members}
          onClose={() => { setModalOpen(false); setEditingTask(null); }}
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