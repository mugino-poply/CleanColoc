'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetchAuth } from '@/lib/api';

type Section = 'profil' | 'securite';

export default function ComptePage() {
  const router = useRouter();
  const { user, accessToken, logout, isLoading } = useAuth();
  const [section, setSection] = useState<Section>('profil');

  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
    if (user) setUsername(user.username || '');
  }, [user, isLoading, router]);

  const handleSave = async () => {
    if (!accessToken) return;
    setSaving(true); setMessage(''); setError('');
    try {
      const res = await apiFetchAuth('/api/users/me', accessToken, {
        method: 'PATCH',
        body: JSON.stringify({ username, avatarUrl }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Une erreur est survenue.');
      } else {
        setMessage('Profil mis à jour !');
        setEditingUsername(false);
        setEditingAvatar(false);
      }
    } catch { setError('Impossible de contacter le serveur.'); }
    finally { setSaving(false); }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleDelete = async () => {
    if (!accessToken) return;
    setDeleteError(''); setDeleteLoading(true);
    try {
      const res = await apiFetchAuth('/api/users/me', accessToken, {
        method: 'DELETE',
        body: JSON.stringify({ password: deletePassword }),
      });
      if (res.status === 204) {
        await logout();
        router.push('/');
      } else {
        const data = await res.json();
        setDeleteError(data.message || 'Une erreur est survenue.');
      }
    } catch { setDeleteError('Impossible de contacter le serveur.'); }
    finally { setDeleteLoading(false); }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#4a6741]">
      <p className="text-white">Chargement...</p>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#4a6741] text-white">

      {/* Sidebar gauche */}
      <aside className="w-64 bg-[#3a5231] flex flex-col p-4 shrink-0">
        {/* Avatar + nom */}
        <div className="flex items-center gap-3 mb-8 px-2 pt-4">
          <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden">
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
              : username.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="overflow-hidden">
            <p className="font-semibold text-sm truncate">{username}</p>
            <p className="text-xs text-white/60 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Navigation */}
        <p className="text-xs font-bold text-white/40 uppercase px-2 mb-2">Paramètres du compte</p>
        <nav className="flex flex-col gap-1">
          <button
            onClick={() => setSection('profil')}
            className={`text-left px-3 py-2 rounded-lg text-sm transition ${section === 'profil' ? 'bg-white/20 text-white font-semibold' : 'text-white/70 hover:bg-white/10'}`}>
            Mon profil
          </button>
          <button
            onClick={() => setSection('securite')}
            className={`text-left px-3 py-2 rounded-lg text-sm transition ${section === 'securite' ? 'bg-white/20 text-white font-semibold' : 'text-white/70 hover:bg-white/10'}`}>
            Sécurité
          </button>
        </nav>

        {/* Déconnexion en bas */}
        <div className="mt-auto pt-4 border-t border-white/10">
          <button onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 transition">
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 p-10 max-w-2xl">

        {section === 'profil' && (
          <div>
            <h1 className="text-2xl font-bold mb-1">Mon profil</h1>
            <p className="text-white/60 text-sm mb-8">Modifie ton nom d'affichage et ta photo de profil.</p>

            {/* Avatar */}
            <div className="flex items-center gap-6 mb-8">
              <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center text-3xl font-bold shrink-0 overflow-hidden">
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="w-20 h-20 rounded-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  : username.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <label className="block text-xs text-white/50 uppercase font-semibold mb-1">Photo de profil (URL)</label>
                {editingAvatar ? (
                  <input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full bg-white/10 border border-white/30 rounded-lg px-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/60"
                    placeholder="https://..." autoFocus />
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-sm truncate">{avatarUrl || 'Aucune photo définie'}</span>
                    <button onClick={() => setEditingAvatar(true)} className="text-white text-sm hover:underline ml-2 shrink-0 bg-white/20 px-3 py-1 rounded-lg">Modifier</button>
                  </div>
                )}
              </div>
            </div>

            {/* Nom d'affichage */}
            <div className="bg-[#3a5231] rounded-xl p-5 mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-white/50 uppercase font-semibold">Nom d'affichage</label>
                <button onClick={() => setEditingUsername(!editingUsername)}
                  className="text-white text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition">
                  {editingUsername ? 'Annuler' : 'Modifier'}
                </button>
              </div>
              {editingUsername ? (
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/10 border border-white/30 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-white/60 mt-2"
                  autoFocus />
              ) : (
                <p className="text-white mt-1">{username}</p>
              )}
            </div>

            {/* Email */}
            <div className="bg-[#3a5231] rounded-xl p-5 mb-6">
              <label className="text-xs text-white/50 uppercase font-semibold block mb-1">Adresse e-mail</label>
              <p className="text-white/80">{user?.email}</p>
            </div>

            {/* Messages */}
            {message && <p className="text-green-300 text-sm mb-4">{message}</p>}
            {error && <p className="text-red-300 text-sm mb-4">{error}</p>}

            {/* Bouton sauvegarder */}
            {(editingUsername || editingAvatar) && (
              <button onClick={handleSave} disabled={saving}
                className="bg-white text-[#4a6741] px-6 py-2 rounded-lg font-semibold hover:bg-white/90 transition disabled:opacity-50">
                {saving ? 'Enregistrement...' : 'Sauvegarder'}
              </button>
            )}
          </div>
        )}

        {section === 'securite' && (
          <div>
            <h1 className="text-2xl font-bold mb-1">Sécurité</h1>
            <p className="text-white/60 text-sm mb-8">Gère la sécurité de ton compte.</p>

            <div className="bg-[#3a5231] rounded-xl p-5 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Mot de passe</p>
                  <p className="text-white/50 text-xs mt-1">Dernière modification inconnue</p>
                </div>
                <button className="text-white text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition">
                  Modifier
                </button>
              </div>
            </div>

            <div className="bg-[#3a5231] rounded-xl p-5 border border-red-400/30">
              <p className="font-semibold text-red-300 text-sm mb-1">Zone de danger</p>
              <p className="text-white/50 text-xs mb-4">La suppression de ton compte est irréversible. Toutes tes données seront effacées.</p>
              <button onClick={() => setShowModal(true)}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition">
                Supprimer mon compte
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modale suppression */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#3a5231] rounded-2xl p-6 w-full max-w-sm shadow-xl border border-white/10">
            <h2 className="text-lg font-bold text-red-300 mb-2">Supprimer mon compte</h2>
            <p className="text-sm text-white/60 mb-4">Cette action est irréversible. Confirme ton mot de passe.</p>
            <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 mb-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50"
              placeholder="Mot de passe" />
            {deleteError && <p className="text-red-300 text-sm mb-3">{deleteError}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setShowModal(false); setDeletePassword(''); setDeleteError(''); }}
                className="flex-1 border border-white/20 rounded-lg py-2 text-white/70 hover:bg-white/10 transition text-sm">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleteLoading || !deletePassword}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 font-semibold transition disabled:opacity-50 text-sm">
                {deleteLoading ? 'Suppression...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}