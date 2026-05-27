import { Op, fn, col } from 'sequelize';
import seedrandom from 'seedrandom';

import Colocation from '../models/Colocation';
import Task from '../models/Task';
import TaskAssignment from '../models/TaskAssignment';
import Membership from '../models/Membership';
import { notify } from './notificationService';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

// ─── Calcul de période ────────────────────────────────────────────────────────

/**
 * Détermine si la période courante d'un interval se termine ce soir (à 23h00).
 * Le cron tourne chaque nuit à 23h00 ; si cette fonction retourne true,
 * le scheduler génère les assignations de la période suivante.
 */
export function isPeriodEndingTonight(
  interval: string,
  colocationCreatedAt: Date,
  now: Date
): boolean {
  const day = now.getDay(); // 0 = dimanche

  switch (interval) {
    case 'daily':
      return true;

    case 'weekly':
      return day === 0;

    case 'biweekly': {
      if (day !== 0) return false;
      // Ancré sur createdAt : une semaine paire (index 1, 3, 5…) = fin de cycle biweekly
      const weeksSinceCreation = Math.floor(
        (now.getTime() - colocationCreatedAt.getTime()) / MS_PER_WEEK
      );
      return weeksSinceCreation % 2 === 1;
    }

    case 'monthly': {
      // Dernier jour du mois : demain est le 1er
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.getDate() === 1;
    }

    default:
      return false;
  }
}

/**
 * Calcule le periodStart et periodEnd de la prochaine période.
 * Appelé uniquement quand isPeriodEndingTonight === true.
 */
export function getNextPeriod(
  interval: string,
  now: Date
): { periodStart: Date; periodEnd: Date } {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  switch (interval) {
    case 'daily': {
      const start = new Date(tomorrow);
      const end = new Date(tomorrow);
      end.setHours(23, 59, 59, 999);
      return { periodStart: start, periodEnd: end };
    }

    case 'weekly': {
      // tomorrow = lundi, fin = dimanche suivant
      const start = new Date(tomorrow);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { periodStart: start, periodEnd: end };
    }

    case 'biweekly': {
      // tomorrow = lundi, fin = dimanche dans 2 semaines
      const start = new Date(tomorrow);
      const end = new Date(start);
      end.setDate(end.getDate() + 13);
      end.setHours(23, 59, 59, 999);
      return { periodStart: start, periodEnd: end };
    }

    case 'monthly': {
      // Premier jour du mois suivant → dernier jour du mois suivant
      const start = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1);
      const end = new Date(tomorrow.getFullYear(), tomorrow.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { periodStart: start, periodEnd: end };
    }

    default:
      throw new Error(`[rotation] interval inconnu : ${interval}`);
  }
}

// ─── Algorithme de sélection ──────────────────────────────────────────────────

/**
 * Sélectionne le prochain assigné pour une tâche.
 *
 * Règle : un membre ne peut refaire la tâche tant que d'autres l'ont complétée
 * moins de fois que lui. En cas d'égalité, tiebreaker déterministe seedé sur
 * (colocationId, periodStart, taskId).
 *
 * Fallback (cas pathologique) : si la sélection échoue, retourne le membre
 * avec le plus faible compteur toutes assignations confondues et logue
 * rotation_constraint_relaxed.
 */
export async function selectNextAssignee(
  taskId: string,
  colocationId: string,
  memberUserIds: string[],
  periodStart: Date
): Promise<string> {
  if (memberUserIds.length === 0) {
    throw new Error(`[rotation] aucun membre actif pour colocationId=${colocationId}`);
  }

  // Compte les terminées par membre pour cette tâche
  const rows = (await TaskAssignment.findAll({
    where: { taskId, status: 'terminée' },
    attributes: ['userId', [fn('COUNT', col('id')), 'count']],
    group: ['userId'],
    raw: true,
  })) as unknown as Array<{ userId: string; count: string }>;

  const countMap = new Map<string, number>(memberUserIds.map(id => [id, 0]));
  for (const row of rows) {
    if (countMap.has(row.userId)) {
      countMap.set(row.userId, parseInt(row.count, 10));
    }
  }

  const minCount = Math.min(...countMap.values());
  const candidates = memberUserIds.filter(id => (countMap.get(id) ?? 0) === minCount);

  if (candidates.length === 0) {
  console.warn(
    `[rotation_constraint_relaxed] taskId=${taskId} colocationId=${colocationId} — candidates vide, fallback membre index 0`
  );
  return memberUserIds[0]!;  // non-null assertion : garanti non-vide par le guard plus haut
  }

  if (candidates.length === 1) return candidates[0]!;

  const seed = `${colocationId}-${periodStart.toISOString()}-${taskId}`;
  const rng = seedrandom(seed);
  return candidates[Math.floor(rng() * candidates.length)]!;
}

// ─── Orchestration ────────────────────────────────────────────────────────────

/**
 * Traite une colocation : pour chaque tâche récurrente dont la période se
 * termine ce soir, marque les assignations non terminées en 'manquée' et
 * génère les assignations de la période suivante.
 */
export async function processColocation(
  colocation: Colocation,
  now: Date
): Promise<void> {
  const tasks = await Task.findAll({
    where: { colocationId: colocation.id, isRecurring: true },
  });

  if (tasks.length === 0) return;

  const memberships = await Membership.findAll({
    where: { colocationId: colocation.id },
    attributes: ['userId'],
  });
  const memberUserIds = memberships.map(m => m.userId);

  if (memberUserIds.length === 0) return;

  const colocationCreatedAt = new Date(colocation.createdAt as unknown as string);

  for (const task of tasks) {
    const interval = task.recurringInterval;
    if (!interval) continue;
    if (!isPeriodEndingTonight(interval, colocationCreatedAt, now)) continue;

    const { periodStart, periodEnd } = getNextPeriod(interval, now);

    // 1. Passe les assignations non terminées de la période courante en 'manquée'
    await TaskAssignment.update(
      { status: 'manquée' },
      {
        where: {
          taskId: task.id,
          status: 'à faire',
          periodEnd: { [Op.lte]: now },
        },
      }
    );

    // 2. Sélectionne l'assigné
    let selectedUserId: string;
    try {
      selectedUserId = await selectNextAssignee(
        task.id,
        colocation.id,
        memberUserIds,
        periodStart
      );
    } catch (err) {
      console.warn(
        `[rotation_constraint_relaxed] taskId=${task.id} colocationId=${colocation.id}`,
        err
      );
      selectedUserId = memberUserIds[0]!;
    }

    // 3. Création idempotente (contrainte UNIQUE taskId + periodStart)
    const [, created] = await TaskAssignment.findOrCreate({
        where: { taskId: task.id, periodStart },
        defaults: {
            taskId: task.id,
            colocationId: colocation.id,
            periodStart,
            userId: selectedUserId,
            status: 'à faire' as const,
            periodEnd,
            taskTitleSnapshot: task.title ?? task.title,
            taskWeightSnapshot: task.weight ?? 1,
            generationMethod: 'auto' as const,
        },
    });

    if (!created) {
      console.log(
        `[rotation] skip idempotent — taskId=${task.id} periodStart=${periodStart.toISOString()}`
      );
      continue;
    }

    // 4. Notification
    await notify(
      selectedUserId,
      `Nouvelle tâche : ${task.title} — du ${periodStart.toLocaleDateString('fr-BE')} au ${periodEnd.toLocaleDateString('fr-BE')}`
    );
  }
}

/**
 * Point d'entrée principal du scheduler.
 * now est injecté pour faciliter les tests.
 */
export async function runRotation(now: Date = new Date()): Promise<void> {
  console.log(`[rotation] démarrage — ${now.toISOString()}`);

  const colocations = await Colocation.findAll({
    where: { autoRotation: true },
  });

  for (const colocation of colocations) {
    try {
      await processColocation(colocation, now);
    } catch (err) {
      // Une colocation en erreur ne bloque pas les autres
      console.error(`[rotation] erreur colocationId=${colocation.id}`, err);
    }
  }

  console.log(`[rotation] terminé — ${colocations.length} colocation(s) traitée(s)`);
}