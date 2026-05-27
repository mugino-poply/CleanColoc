/**
 * Stub du service de notification.
 * US-25/26 remplaceront ce corps par les vrais appels email/push.
 * L'interface publique (signature de notify) ne changera pas.
 */
export async function notify(userId: string, message: string): Promise<void> {
  console.log(`[notify] userId=${userId} — ${message}`);
}