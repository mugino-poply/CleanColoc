'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Stats {
  totalUsers: number; totalColocations: number; totalTasks: number; totalAssignments: number;
  recentUsers: UserRow[];
}
interface UserRow { id: string; username: string; email: string; avatarUrl: string | null; createdAt: string; }
interface ColocationRow { id: string; name: string; description: string | null; inviteCode: string; autoRotation: boolean; memberCount: number; taskCount: number; createdAt: string; }
interface TaskRow { id: string; title: string; isRecurring: boolean; recurringInterval: string | null; weight: number; createdAt: string; colocation: { name: string }; }
interface AssignmentRow { id: string; taskTitleSnapshot: string; status: string; periodStart: string; periodEnd: string; generationMethod: string; user: { username: string }; colocation: { name: string }; }
type Tab = 'dashboard' | 'users' | 'colocations' | 'tasks' | 'assignments';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') ?? '' : '';
  const res = await fetch(`${API}/api/admin${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  });
  if (!res.ok) { 
    const b = await res.json().catch(() => ({})); 
    const errorMsg = b.message ?? `Erreur ${res.status}`;
    const error = new Error(errorMsg);
    (error as any).status = res.status; 
    throw error; 
  }
  return res.json();
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_STYLES: Record<string, string> = {
  'à faire': 'bg-gray-100 text-gray-600',
  'en cours': 'bg-blue-100 text-blue-700',
  'fait': 'bg-green-100 text-green-700',
};

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [colocations, setColocations] = useState<ColocationRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { 
      router.replace('/login'); 
      return; 
    }
    
    // Si un token existe, on donne l'accès direct à la page sans bloquer
    setReady(true);
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (tab === 'dashboard')        setStats(await apiFetch<Stats>('/stats'));
      else if (tab === 'users')       { const q = search ? `?search=${encodeURIComponent(search)}` : ''; const d = await apiFetch<{ users: UserRow[] }>(`/users${q}`); setUsers(d.users); }
      else if (tab === 'colocations') setColocations(await apiFetch<ColocationRow[]>('/colocations'));
      else if (tab === 'tasks')       setTasks(await apiFetch<TaskRow[]>('/tasks'));
      else if (tab === 'assignments') setAssignments(await apiFetch<AssignmentRow[]>('/assignments'));
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      
      // MODIFICATION : Si l'API renvoie 403 (pas admin sur le papier), on affiche l'erreur 
      // sur l'écran plutôt que de te jeter dehors agressivement vers le login.
      if (err.status === 401) {
        localStorage.removeItem('accessToken'); 
        router.replace('/login');
        return;
      }
      setError(err.message ?? 'Erreur de droits ou de connexion');
    } finally { setLoading(false); }
  }, [tab, search]);

  useEffect(() => { if (ready) load(); }, [tab, ready, load]);

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    try { await apiFetch(`/users/${id}`, { method: 'DELETE' }); setUsers(p => p.filter(u => u.id !== id)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur'); }
  };

  const handleDeleteColocation = async (id: string) => {
    if (!confirm('Supprimer cette colocation et toutes ses données ?')) return;
    try { await apiFetch(`/colocations/${id}`, { method: 'DELETE' }); setColocations(p => p.filter(c => c.id !== id)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur'); }
  };

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: 'dashboard',   label: 'Dashboard',    emoji: '📊' },
    { key: 'users',       label: 'Utilisateurs', emoji: '👥' },
    { key: 'colocations', label: 'Colocations',  emoji: '🏠' },
    { key: 'tasks',       label: 'Tâches',        emoji: '✅' },
    { key: 'assignments', label: 'Assignations',  emoji: '📋' },
  ];

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">🧹</span>
          <span className="font-semibold text-gray-900 text-sm">CleanColoc</span>
          <span className="text-gray-300 text-xs mx-1">|</span>
          <span className="text-xs text-gray-400 font-medium uppercase tracking-widest">Admin</span>
        </div>
        <button onClick={() => { localStorage.clear(); router.replace('/login'); }} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
          Déconnexion
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-52 bg-white border-r border-gray-200 pt-3 shrink-0">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left border-r-2 ${
                tab === t.key ? 'bg-blue-50 text-blue-700 font-medium border-blue-500' : 'text-gray-500 hover:bg-gray-50 border-transparent'
              }`}>
              <span className="text-base">{t.emoji}</span>{t.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-6">
          {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">⚠️ {error}</div>}
          {loading && <div className="text-center py-20 text-gray-300 text-sm">Chargement…</div>}

          {/* Dashboard */}
          {tab === 'dashboard' && !loading && stats && (
            <div className="space-y-6">
              <h1 className="text-lg font-semibold text-gray-900">Vue d&apos;ensemble</h1>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard label="Utilisateurs"  value={stats.totalUsers}       color="text-blue-600"    />
                <StatCard label="Colocations"   value={stats.totalColocations} color="text-emerald-600" />
                <StatCard label="Tâches"        value={stats.totalTasks}       color="text-amber-600"   />
                <StatCard label="Assignations"  value={stats.totalAssignments} color="text-violet-600"  />
              </div>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Derniers inscrits</p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>{['Utilisateur','Email','Inscrit le'].map(h => <th key={h} className="text-left px-5 py-2.5 text-xs text-gray-400 font-normal">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {stats.recentUsers.map(u => (
                      <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50/60">
                        <td className="px-5 py-2.5 font-medium text-gray-800">{u.username}</td>
                        <td className="px-5 py-2.5 text-gray-400">{u.email}</td>
                        <td className="px-5 py-2.5 text-gray-400">{fmt(u.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Users */}
          {tab === 'users' && !loading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-gray-900">Utilisateurs</h1>
                <div className="flex gap-2">
                  <input type="text" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && load()}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <button onClick={load} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">Filtrer</button>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Utilisateur','Email','Inscrit le',''].map((h,i) => <th key={i} className={`px-5 py-2.5 text-xs text-gray-400 font-normal ${i===3?'text-right':'text-left'}`}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50/60">
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            {u.avatarUrl
                              ? <img src={u.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                              : <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-medium">{u.username[0]?.toUpperCase()}</div>
                            }
                            <span className="font-medium text-gray-800">{u.username}</span>
                          </div>
                        </td>
                        <td className="px-5 py-2.5 text-gray-400">{u.email}</td>
                        <td className="px-5 py-2.5 text-gray-400">{fmt(u.createdAt)}</td>
                        <td className="px-5 py-2.5 text-right">
                          <button onClick={() => handleDeleteUser(u.id)} className="text-xs px-2.5 py-1 rounded-md border border-red-200 text-red-500 hover:bg-red-50 transition-colors">Supprimer</button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-300 text-sm">Aucun résultat</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Colocations */}
          {tab === 'colocations' && !loading && (
            <div className="space-y-4">
              <h1 className="text-lg font-semibold text-gray-900">Colocations</h1>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>{['Nom','Code','Membres','Tâches','Rotation','Créée le',''].map((h,i) => <th key={i} className={`px-5 py-2.5 text-xs text-gray-400 font-normal ${i===6?'text-right':'text-left'}`}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {colocations.map(c => (
                      <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/60">
                        <td className="px-5 py-2.5 font-medium text-gray-800">{c.name}</td>
                        <td className="px-5 py-2.5"><code className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono">{c.inviteCode}</code></td>
                        <td className="px-5 py-2.5 text-gray-500">{c.memberCount}</td>
                        <td className="px-5 py-2.5 text-gray-500">{c.taskCount}</td>
                        <td className="px-5 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.autoRotation ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{c.autoRotation ? 'oui' : 'non'}</span>
                        </td>
                        <td className="px-5 py-2.5 text-gray-400">{fmt(c.createdAt)}</td>
                        <td className="px-5 py-2.5 text-right">
                          <button onClick={() => handleDeleteColocation(c.id)} className="text-xs px-2.5 py-1 rounded-md border border-red-200 text-red-500 hover:bg-red-50 transition-colors">Supprimer</button>
                        </td>
                      </tr>
                    ))}
                    {colocations.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-300 text-sm">Aucune colocation</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tasks */}
          {tab === 'tasks' && !loading && (
            <div className="space-y-4">
              <h1 className="text-lg font-semibold text-gray-900">Tâches</h1>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>{['Titre','Colocation','Récurrence','Poids','Créée le'].map((h,i) => <th key={i} className="px-5 py-2.5 text-xs text-gray-400 font-normal text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {tasks.map(t => (
                      <tr key={t.id} className="border-t border-gray-50 hover:bg-gray-50/60">
                        <td className="px-5 py-2.5 font-medium text-gray-800">{t.title}</td>
                        <td className="px-5 py-2.5 text-gray-500">{t.colocation?.name ?? '—'}</td>
                        <td className="px-5 py-2.5">
                          {t.isRecurring
                            ? <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{t.recurringInterval ?? 'récurrent'}</span>
                            : <span className="text-xs text-gray-300">ponctuel</span>}
                        </td>
                        <td className="px-5 py-2.5 text-gray-500">{t.weight}</td>
                        <td className="px-5 py-2.5 text-gray-400">{fmt(t.createdAt)}</td>
                      </tr>
                    ))}
                    {tasks.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-300 text-sm">Aucune tâche</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Assignments */}
          {tab === 'assignments' && !loading && (
            <div className="space-y-4">
              <h1 className="text-lg font-semibold text-gray-900">Assignations</h1>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>{['Tâche','Utilisateur','Colocation','Période','Méthode','Statut'].map((h,i) => <th key={i} className="px-5 py-2.5 text-xs text-gray-400 font-normal text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {assignments.map(a => (
                      <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50/60">
                        <td className="px-5 py-2.5 font-medium text-gray-800">{a.taskTitleSnapshot}</td>
                        <td className="px-5 py-2.5 text-gray-500">{a.user?.username ?? '—'}</td>
                        <td className="px-5 py-2.5 text-gray-500">{a.colocation?.name ?? '—'}</td>
                        <td className="px-5 py-2.5 text-gray-400 text-xs">{fmt(a.periodStart)} → {fmt(a.periodEnd)}</td>
                        <td className="px-5 py-2.5"><span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{a.generationMethod}</span></td>
                        <td className="px-5 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[a.status] ?? 'bg-gray-100 text-gray-500'}`}>{a.status}</span>
                        </td>
                      </tr>
                    ))}
                    {assignments.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-300 text-sm">Aucune assignation</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}