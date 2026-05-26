'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();

  const [autoRotation, setAutoRotation] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    apiFetch(`/api/colocations/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setAutoRotation(data.autoRotation ?? true);
        setLoading(false);
      })
      .catch(() => {
        setError('Impossible de charger les paramètres.');
        setLoading(false);
      });
  }, [accessToken, id]);

  const handleToggle = async (value: boolean) => {
    setSaving(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/colocations/${id}/settings`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ autoRotation: value }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? 'Erreur lors de la mise à jour.');
        return;
      }

      setAutoRotation(value);
    } catch {
      setError('Erreur réseau.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        background:
          'radial-gradient(ellipse at top left, #4a7a2e 0%, #3d6124 40%, #2a4418 100%)',
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-8 flex flex-col gap-8 anim-1"
        style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <button
          onClick={() => router.push(`/colocation/${id}`)}
          className="text-white/60 hover:text-white text-sm self-start transition-colors"
        >
          ← Retour
        </button>

        <h1
          className="text-4xl text-white tracking-widest"
          style={{ fontFamily: 'Bebas Neue, sans-serif' }}
        >
          Paramètres
        </h1>

        {loading ? (
          <p className="text-white/60 text-sm">Chargement…</p>
        ) : (
          <div className="flex flex-col gap-6">
            <div
              className="flex items-center justify-between rounded-xl px-5 py-4"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <div className="flex flex-col gap-1">
                <span className="text-white font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Rotation automatique
                </span>
                <span className="text-white/50 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {autoRotation
                    ? 'Les tâches sont assignées automatiquement chaque semaine.'
                    : 'Les tâches doivent être assignées manuellement.'}
                </span>
              </div>
              <Switch
                checked={autoRotation}
                onCheckedChange={handleToggle}
                disabled={saving}
                className="ml-4 shrink-0"
              />
            </div>

            {error && (
              <p className="text-red-300 text-sm text-center" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}