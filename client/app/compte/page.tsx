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

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      setUsername(user.username || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, avatarUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Une erreur est survenue.');
      } else {
        setMessage('Profil mis à jour avec succès !');
        // Mettre à jour le localStorage avec les nouvelles infos
        const stored = localStorage.getItem('user');
        if (stored) {
          const user = JSON.parse(stored);
          localStorage.setItem('user', JSON.stringify({ ...user, username, avatarUrl }));
        }
      }
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#4a6741] px-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-lg">
        <h1 className="text-2xl font-bold text-[#4a6741] mb-6 text-center">Mon profil</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom d'affichage
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#4a6741]"
              placeholder="Ton prénom ou pseudo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL de l'avatar
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#4a6741]"
              placeholder="https://..."
            />
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt="Aperçu avatar"
                className="mt-2 w-16 h-16 rounded-full object-cover border"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
          </div>

          {message && <p className="text-green-600 text-sm text-center">{message}</p>}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-[#4a6741] text-white rounded-lg py-2 font-semibold hover:bg-[#3a5231] transition disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : 'Sauvegarder'}
          </button>
        </form>
      </div>
    </main>
  );
}