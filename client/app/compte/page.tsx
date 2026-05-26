'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ComptePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Modale suppression
  const [showModal, setShowModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      setUsername(user.username || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, []);

  const getToken = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return null; }
    return token;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(''); setError(''); setLoading(true);
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username, avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Une erreur est survenue.');
      } else {
        setMessage('Profil mis à jour avec succès !');
        const stored = localStorage.getItem('user');
        if (stored) localStorage.setItem('user', JSON.stringify({ ...JSON.parse(stored), username, avatarUrl }));
      }
    } catch { setError('Impossible de contacter le serveur.'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    setDeleteError(''); setDeleteLoading(true);
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (res.status === 204) {
        localStorage.clear();
        router.push('/');
      } else {
        const data = await res.json();
        setDeleteError(data.message || 'Une erreur est survenue.');
      }
    } catch { setDeleteError('Impossible de contacter le serveur.'); }
    finally { setDeleteLoading(false); }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#4a6741] px-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-lg">
        <h1 className="text-2xl font-bold text-[#4a6741] mb-6 text-center">Mon profil</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'affichage</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#4a6741]"
              placeholder="Ton prénom ou pseudo" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL de l'avatar</label>
            <input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#4a6741]"
              placeholder="https://..." />
            {avatarUrl && (
              <img src={avatarUrl} alt="Aperçu avatar"
                className="mt-2 w-16 h-16 rounded-full object-cover border"
                onError={(e) => (e.currentTarget.style.display = 'none')} />
            )}
          </div>
          {message && <p className="text-green-600 text-sm text-center">{message}</p>}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading}
            className="bg-[#4a6741] text-white rounded-lg py-2 font-semibold hover:bg-[#3a5231] transition disabled:opacity-50">
            {loading ? 'Enregistrement...' : 'Sauvegarder'}
          </button>
        </form>

        <button onClick={() => setShowModal(true)}
          className="mt-6 w-full border border-red-500 text-red-500 rounded-lg py-2 font-semibold hover:bg-red-50 transition">
          Supprimer mon compte
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-red-600 mb-2">Supprimer mon compte</h2>
            <p className="text-sm text-gray-600 mb-4">Cette action est irréversible. Confirme ton mot de passe pour continuer.</p>
            <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Mot de passe" />
            {deleteError && <p className="text-red-500 text-sm mb-3">{deleteError}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setShowModal(false); setDeletePassword(''); setDeleteError(''); }}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-gray-600 hover:bg-gray-50 transition">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleteLoading || !deletePassword}
                className="flex-1 bg-red-500 text-white rounded-lg py-2 font-semibold hover:bg-red-600 transition disabled:opacity-50">
                {deleteLoading ? 'Suppression...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}