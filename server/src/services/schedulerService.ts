import cron from 'node-cron';
import { runRotation } from './rotationService';

export function startScheduler(): void {
  // Chaque nuit à 23h00, timezone Europe/Brussels
  cron.schedule(
    '0 23 * * *',
    async () => {
      try {
        await runRotation();
      } catch (err) {
        console.error('[scheduler] erreur non rattrapée dans runRotation', err);
      }
    },
    { timezone: 'Europe/Brussels' }
  );

  console.log('[scheduler] cron de rotation démarré — 23h00 Europe/Brussels, chaque nuit');
}