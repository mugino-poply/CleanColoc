'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Member {
  membershipId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: 'admin' | 'member';
  joinedAt: string;
}

interface TransferDialogProps {
  assignmentTitle: string;
  currentUserId: string;
  members: Member[];
  onConfirm: (toUserId: string) => Promise<void>;
  onClose: () => void;
}

export default function TransferDialog({
  assignmentTitle,
  currentUserId,
  members,
  onConfirm,
  onClose,
}: TransferDialogProps) {
  const eligibleMembers = members.filter((m) => m.userId !== currentUserId);
  const [toUserId, setToUserId] = useState<string>(eligibleMembers[0]?.userId ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!toUserId) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(toUserId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.');
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        style={{
          background: 'linear-gradient(135deg, rgba(74,122,46,0.98), rgba(61,97,36,0.99))',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 24,
          color: '#fff',
          fontFamily: 'DM Sans, sans-serif',
          maxWidth: 420,
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: '1.8rem',
              letterSpacing: 2,
              color: '#fff',
            }}
          >
            Transférer la tâche
          </DialogTitle>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>
            {assignmentTitle}
          </p>
        </DialogHeader>

        <div style={{ margin: '1.25rem 0' }}>
          <label
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.8rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'block',
              marginBottom: '0.5rem',
            }}
          >
            Transférer à
          </label>

          {eligibleMembers.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
              Aucun autre membre dans la colocation.
            </p>
          ) : (
            <Select value={toUserId} onValueChange={setToUserId}>
              <SelectTrigger
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 12,
                  color: '#fff',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 14,
                }}
              >
                <SelectValue placeholder="Choisir un membre" />
              </SelectTrigger>
              <SelectContent
                style={{
                  background: '#3d6124',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 12,
                  color: '#fff',
                }}
              >
                {eligibleMembers.map((m) => (
                  <SelectItem
                    key={m.userId}
                    value={m.userId}
                    style={{ color: '#fff', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {m.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {error && (
            <p style={{ color: '#e24b4a', fontSize: 13, marginTop: '0.5rem' }}>{error}</p>
          )}
        </div>

        <DialogFooter style={{ gap: '0.75rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.4)',
              color: '#fff',
              borderRadius: 999,
              padding: '0.7rem',
              cursor: 'pointer',
              fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 14,
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || !toUserId || eligibleMembers.length === 0}
            style={{
              flex: 1,
              background: '#fff',
              color: '#3d6124',
              border: 'none',
              borderRadius: 999,
              padding: '0.7rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 14,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Transfert…' : 'Confirmer'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}