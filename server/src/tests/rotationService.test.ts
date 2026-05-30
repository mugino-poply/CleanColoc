import {
  isPeriodEndingTonight,
  getNextPeriod,
  getCurrentPeriod,
  selectNextAssignee,
  regenerateForColocation,
  processColocation,
} from '../services/rotationService';
import TaskAssignment from '../models/TaskAssignment';
import Task           from '../models/Task';
import Membership     from '../models/Membership';
import Colocation     from '../models/Colocation';

jest.mock('../models/TaskAssignment', () => ({
  __esModule: true,
  default: {
    findAll:      jest.fn(),
    update:       jest.fn(),
    findOrCreate: jest.fn(),
    create:       jest.fn(),
    destroy:      jest.fn(),
  },
}));

jest.mock('../models/Task', () => ({
  __esModule: true,
  default: { findAll: jest.fn() },
}));

jest.mock('../models/Membership', () => ({
  __esModule: true,
  default: { findAll: jest.fn() },
}));

jest.mock('../models/Colocation', () => ({
  __esModule: true,
  default: { findByPk: jest.fn(), findAll: jest.fn() },
}));

jest.mock('../services/notificationService', () => ({
  notify: jest.fn().mockResolvedValue(undefined),
}));

// ─── isPeriodEndingTonight ────────────────────────────────────────────────────

describe('isPeriodEndingTonight', () => {
  const createdAt = new Date(2026, 4, 4);      // Lundi 4 mai 2026
  const sunday    = new Date(2026, 4, 31, 12); // Dimanche 31 mai 2026
  const wednesday = new Date(2026, 5, 3,  12); // Mercredi 3 juin 2026
  const lastApril = new Date(2026, 3, 30, 12); // Jeudi 30 avril 2026 (dernier jour du mois)
  const midApril  = new Date(2026, 3, 15, 12); // Mercredi 15 avril 2026

  it("daily — retourne true quel que soit le jour", () => {
    expect(isPeriodEndingTonight('daily', createdAt, wednesday)).toBe(true);
    expect(isPeriodEndingTonight('daily', createdAt, sunday)).toBe(true);
  });

  it("weekly — retourne true le dimanche", () => {
    expect(isPeriodEndingTonight('weekly', createdAt, sunday)).toBe(true);
  });

  it("weekly — retourne false hors dimanche", () => {
    expect(isPeriodEndingTonight('weekly', createdAt, wednesday)).toBe(false);
  });

  it("biweekly — retourne false le dimanche de la semaine paire (index 0)", () => {
    // Sunday May 10 : (May10 - May4) = 6j → floor(6/7) = 0 → 0 % 2 = 0 → false
    const sundayWeek0 = new Date(2026, 4, 10, 12);
    expect(isPeriodEndingTonight('biweekly', createdAt, sundayWeek0)).toBe(false);
  });

  it("biweekly — retourne true le dimanche de la semaine impaire (index 1)", () => {
    // Sunday May 17 : (May17 - May4) = 13j → floor(13/7) = 1 → 1 % 2 = 1 → true
    const sundayWeek1 = new Date(2026, 4, 17, 12);
    expect(isPeriodEndingTonight('biweekly', createdAt, sundayWeek1)).toBe(true);
  });

  it("biweekly — retourne false un jour qui n'est pas dimanche", () => {
    expect(isPeriodEndingTonight('biweekly', createdAt, wednesday)).toBe(false);
  });

  it("monthly — retourne true le dernier jour du mois (demain = 1er)", () => {
    expect(isPeriodEndingTonight('monthly', createdAt, lastApril)).toBe(true);
  });

  it("monthly — retourne false en milieu de mois", () => {
    expect(isPeriodEndingTonight('monthly', createdAt, midApril)).toBe(false);
  });

  it("retourne false pour un interval inconnu", () => {
    expect(isPeriodEndingTonight('unknown', createdAt, sunday)).toBe(false);
  });
});

// ─── getNextPeriod ────────────────────────────────────────────────────────────
// now = dimanche 31 mai 2026 (midi) — tomorrow = lundi 1er juin

describe('getNextPeriod', () => {
  const now = new Date(2026, 4, 31, 12, 0, 0);

  it("daily — retourne demain entier (00:00 → 23:59:59.999)", () => {
    const { periodStart, periodEnd } = getNextPeriod('daily', now);
    expect(periodStart.getDate()).toBe(1);
    expect(periodStart.getMonth()).toBe(5);   // juin
    expect(periodStart.getHours()).toBe(0);
    expect(periodEnd.getDate()).toBe(1);
    expect(periodEnd.getHours()).toBe(23);
    expect(periodEnd.getMinutes()).toBe(59);
    expect(periodEnd.getMilliseconds()).toBe(999);
  });

  it("weekly — retourne lundi prochain au dimanche suivant (7 jours)", () => {
    const { periodStart, periodEnd } = getNextPeriod('weekly', now);
    expect(periodStart.getDate()).toBe(1);    // lundi 1er juin
    expect(periodStart.getMonth()).toBe(5);
    expect(periodEnd.getDate()).toBe(7);      // dimanche 7 juin
    expect(periodEnd.getHours()).toBe(23);
  });

  it("biweekly — retourne lundi prochain à dimanche dans 2 semaines (14 jours)", () => {
    const { periodStart, periodEnd } = getNextPeriod('biweekly', now);
    expect(periodStart.getDate()).toBe(1);    // lundi 1er juin
    expect(periodEnd.getDate()).toBe(14);     // dimanche 14 juin
    expect(periodEnd.getHours()).toBe(23);
  });

  it("monthly — retourne le 1er au dernier jour du mois prochain", () => {
    const { periodStart, periodEnd } = getNextPeriod('monthly', now);
    expect(periodStart.getDate()).toBe(1);
    expect(periodStart.getMonth()).toBe(5);   // juin
    expect(periodEnd.getDate()).toBe(30);     // 30 juin
    expect(periodEnd.getMonth()).toBe(5);
    expect(periodEnd.getHours()).toBe(23);
  });

  it("lève une erreur pour un interval inconnu", () => {
    expect(() => getNextPeriod('unknown', now)).toThrow();
  });
});

// ─── getCurrentPeriod ─────────────────────────────────────────────────────────
// now = mercredi 3 juin 2026 (midi) / createdAt = lundi 4 mai 2026

describe('getCurrentPeriod', () => {
  const now       = new Date(2026, 5, 3, 12, 0, 0); // mercredi 3 juin
  const createdAt = new Date(2026, 4, 4);             // lundi 4 mai

  it("daily — retourne aujourd'hui entier", () => {
    const { periodStart, periodEnd } = getCurrentPeriod('daily', createdAt, now);
    expect(periodStart.getDate()).toBe(3);
    expect(periodStart.getMonth()).toBe(5);   // juin
    expect(periodStart.getHours()).toBe(0);
    expect(periodEnd.getDate()).toBe(3);
    expect(periodEnd.getHours()).toBe(23);
    expect(periodEnd.getMilliseconds()).toBe(999);
  });

  it("weekly — retourne le lundi au dimanche de la semaine courante", () => {
    const { periodStart, periodEnd } = getCurrentPeriod('weekly', createdAt, now);
    expect(periodStart.getDate()).toBe(1);    // lundi 1er juin
    expect(periodStart.getMonth()).toBe(5);
    expect(periodEnd.getDate()).toBe(7);      // dimanche 7 juin
    expect(periodEnd.getHours()).toBe(23);
  });

  it("biweekly — retourne le début du cycle biweekly courant", () => {
    // thisMonday = 1er juin, weeksSinceCreation = 4, 4%2=0 → cycleStart = 1er juin
    const { periodStart, periodEnd } = getCurrentPeriod('biweekly', createdAt, now);
    expect(periodStart.getDate()).toBe(1);    // lundi 1er juin
    expect(periodStart.getMonth()).toBe(5);
    expect(periodEnd.getDate()).toBe(14);     // dimanche 14 juin
  });

  it("biweekly — now en milieu de cycle impair retourne le même cycle que la semaine précédente", () => {
    // now = mercredi 10 juin, thisMonday = 8 juin, weeksSince = 5, 5%2=1 → recule à 1er juin
    const nowMid = new Date(2026, 5, 10, 12, 0, 0);
    const { periodStart, periodEnd } = getCurrentPeriod('biweekly', createdAt, nowMid);
    expect(periodStart.getDate()).toBe(1);
    expect(periodEnd.getDate()).toBe(14);
  });

  it("monthly — retourne le 1er au dernier jour du mois courant", () => {
    const { periodStart, periodEnd } = getCurrentPeriod('monthly', createdAt, now);
    expect(periodStart.getDate()).toBe(1);
    expect(periodStart.getMonth()).toBe(5);   // juin
    expect(periodEnd.getDate()).toBe(30);     // 30 juin
    expect(periodEnd.getMonth()).toBe(5);
  });

  it("lève une erreur pour un interval inconnu", () => {
    expect(() => getCurrentPeriod('unknown', createdAt, now)).toThrow();
  });
});

// ─── selectNextAssignee ───────────────────────────────────────────────────────

describe('selectNextAssignee', () => {
  const periodStart = new Date(2026, 5, 1);

  beforeEach(() => jest.clearAllMocks());

  it("lève une erreur si la liste de membres est vide", async () => {
    await expect(
      selectNextAssignee('task-1', 'coloc-1', [], periodStart)
    ).rejects.toThrow();
  });

  it("retourne directement l'unique membre s'il n'y en a qu'un", async () => {
    (TaskAssignment.findAll as jest.Mock).mockResolvedValue([]);
    const result = await selectNextAssignee('task-1', 'coloc-1', ['user-A'], periodStart);
    expect(result).toBe('user-A');
  });

  it("sélectionne le membre avec le moins de tâches terminées", async () => {
    // user-A : 3 terminées, user-B : 1 → doit choisir user-B
    (TaskAssignment.findAll as jest.Mock).mockResolvedValue([
      { userId: 'user-A', count: '3' },
      { userId: 'user-B', count: '1' },
    ]);
    const result = await selectNextAssignee(
      'task-1', 'coloc-1', ['user-A', 'user-B'], periodStart
    );
    expect(result).toBe('user-B');
  });

  it("initialise à 0 les membres absents de l'historique", async () => {
    // user-A : 2, user-B : aucune entrée → user-B = 0 → doit être choisi
    (TaskAssignment.findAll as jest.Mock).mockResolvedValue([
      { userId: 'user-A', count: '2' },
    ]);
    const result = await selectNextAssignee(
      'task-1', 'coloc-1', ['user-A', 'user-B'], periodStart
    );
    expect(result).toBe('user-B');
  });

  it("tiebreaker déterministe : le même seed produit toujours le même résultat", async () => {
    (TaskAssignment.findAll as jest.Mock).mockResolvedValue([]);
    const result1 = await selectNextAssignee(
      'task-1', 'coloc-1', ['user-A', 'user-B', 'user-C'], periodStart
    );
    (TaskAssignment.findAll as jest.Mock).mockResolvedValue([]);
    const result2 = await selectNextAssignee(
      'task-1', 'coloc-1', ['user-A', 'user-B', 'user-C'], periodStart
    );
    expect(result1).toBe(result2);
    expect(['user-A', 'user-B', 'user-C']).toContain(result1);
  });

  it("tiebreaker différent si le taskId change (seed différent)", async () => {
    const members = ['user-A', 'user-B', 'user-C', 'user-D', 'user-E'];
    const results = new Set<string>();
    for (let i = 0; i < 5; i++) {
      (TaskAssignment.findAll as jest.Mock).mockResolvedValue([]);
      const r = await selectNextAssignee(`task-${i}`, 'coloc-1', members, periodStart);
      results.add(r);
    }
    expect(results.size).toBeGreaterThan(1);
  });
});

// ─── regenerateForColocation ──────────────────────────────────────────────────

describe('regenerateForColocation', () => {
  const now = new Date(2026, 5, 3, 12, 0, 0); // mercredi 3 juin 2026

  beforeEach(() => jest.clearAllMocks());

  it("lève une erreur si la colocation est introuvable", async () => {
    (Colocation.findByPk as jest.Mock).mockResolvedValue(null);
    await expect(
      regenerateForColocation('ghost-coloc', 'current', now)
    ).rejects.toThrow('Colocation introuvable');
  });

  it("retourne un tableau vide s'il n'y a aucune tâche récurrente", async () => {
    (Colocation.findByPk as jest.Mock).mockResolvedValue({
      id: 'coloc-1', createdAt: new Date(2026, 4, 4),
    });
    (Task.findAll       as jest.Mock).mockResolvedValue([]);
    (Membership.findAll as jest.Mock).mockResolvedValue([{ userId: 'user-A' }]);

    const result = await regenerateForColocation('coloc-1', 'current', now);
    expect(result).toEqual([]);
    expect(TaskAssignment.create).not.toHaveBeenCalled();
  });

  it("crée une assignation par tâche récurrente et les retourne", async () => {
    (Colocation.findByPk as jest.Mock).mockResolvedValue({
      id: 'coloc-1', createdAt: new Date(2026, 4, 4),
    });
    (Task.findAll as jest.Mock).mockResolvedValue([
      { id: 'task-1', title: 'Aspirateur', recurringInterval: 'weekly', weight: 1 },
    ]);
    (Membership.findAll      as jest.Mock).mockResolvedValue([{ userId: 'user-A' }, { userId: 'user-B' }]);
    (TaskAssignment.findAll  as jest.Mock).mockResolvedValue([]);
    (TaskAssignment.destroy  as jest.Mock).mockResolvedValue(1);
    const mockAssignment = { id: 'assign-new', taskId: 'task-1', userId: 'user-A' };
    (TaskAssignment.create   as jest.Mock).mockResolvedValue(mockAssignment);

    const result = await regenerateForColocation('coloc-1', 'current', now);

    expect(TaskAssignment.destroy).toHaveBeenCalledTimes(1);
    expect(TaskAssignment.create).toHaveBeenCalledTimes(1);
    expect(TaskAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 'task-1', colocationId: 'coloc-1', status: 'à faire' })
    );
    expect(result).toEqual([mockAssignment]);
  });

  it("saute les tâches sans recurringInterval", async () => {
    (Colocation.findByPk as jest.Mock).mockResolvedValue({
      id: 'coloc-1', createdAt: new Date(2026, 4, 4),
    });
    (Task.findAll as jest.Mock).mockResolvedValue([
      { id: 'task-no-interval', title: 'Sans interval', recurringInterval: null, weight: 1 },
    ]);
    (Membership.findAll as jest.Mock).mockResolvedValue([{ userId: 'user-A' }]);

    const result = await regenerateForColocation('coloc-1', 'next', now);

    expect(TaskAssignment.create).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("génère la période 'next' quand period='next'", async () => {
    (Colocation.findByPk as jest.Mock).mockResolvedValue({
      id: 'coloc-1', createdAt: new Date(2026, 4, 4),
    });
    (Task.findAll as jest.Mock).mockResolvedValue([
      { id: 'task-1', title: 'Aspirateur', recurringInterval: 'weekly', weight: 1 },
    ]);
    (Membership.findAll     as jest.Mock).mockResolvedValue([{ userId: 'user-A' }]);
    (TaskAssignment.findAll as jest.Mock).mockResolvedValue([]);
    (TaskAssignment.destroy as jest.Mock).mockResolvedValue(1);
    (TaskAssignment.create  as jest.Mock).mockResolvedValue({ id: 'assign-next' });

    // now = dimanche 31 mai → next weekly = lundi 1er juin (tomorrow)
    const sunday = new Date(2026, 4, 31, 12, 0, 0);
    await regenerateForColocation('coloc-1', 'next', sunday);

    const createCall = (TaskAssignment.create as jest.Mock).mock.calls[0]?.[0];
    expect(createCall.periodStart.getDate()).toBe(1);   // lundi 1er juin
    expect(createCall.periodStart.getMonth()).toBe(5);  // juin
  });
});

// ─── processColocation ────────────────────────────────────────────────────────
// now = dimanche 31 mai 2026 à 23h → isPeriodEndingTonight weekly = true

describe('processColocation', () => {
  const now = new Date(2026, 4, 31, 23, 0, 0);

  const buildColocation = () => ({
    id:        'coloc-1',
    createdAt: new Date(2026, 4, 4),
  });

  beforeEach(() => jest.clearAllMocks());

  it("retourne immédiatement si la colocation n'a aucune tâche récurrente", async () => {
    (Task.findAll as jest.Mock).mockResolvedValue([]);

    await processColocation(buildColocation() as any, now);

    expect(Membership.findAll).not.toHaveBeenCalled();
    expect(TaskAssignment.update).not.toHaveBeenCalled();
  });

  it("retourne immédiatement si la colocation n'a aucun membre", async () => {
    (Task.findAll       as jest.Mock).mockResolvedValue([
      { id: 'task-1', recurringInterval: 'weekly', title: 'Test', weight: 1 },
    ]);
    (Membership.findAll as jest.Mock).mockResolvedValue([]);

    await processColocation(buildColocation() as any, now);

    expect(TaskAssignment.update).not.toHaveBeenCalled();
  });

  it("saute une tâche dont la période ne se termine pas ce soir", async () => {
    // now = mercredi → weekly ne se termine pas ce soir
    const wednesday = new Date(2026, 5, 3, 23, 0, 0);
    (Task.findAll       as jest.Mock).mockResolvedValue([
      { id: 'task-1', recurringInterval: 'weekly', title: 'Nettoyer', weight: 1 },
    ]);
    (Membership.findAll as jest.Mock).mockResolvedValue([{ userId: 'user-A' }]);

    await processColocation(buildColocation() as any, wednesday);

    expect(TaskAssignment.update).not.toHaveBeenCalled();
    expect(TaskAssignment.findOrCreate).not.toHaveBeenCalled();
  });

  it("marque les assignations non terminées en 'manquée' et crée la suivante", async () => {
    (Task.findAll as jest.Mock).mockResolvedValue([
      { id: 'task-1', recurringInterval: 'weekly', title: 'Aspirateur', weight: 2 },
    ]);
    (Membership.findAll      as jest.Mock).mockResolvedValue([{ userId: 'user-A' }]);
    (TaskAssignment.findAll  as jest.Mock).mockResolvedValue([]);
    (TaskAssignment.update   as jest.Mock).mockResolvedValue([1]);
    (TaskAssignment.findOrCreate as jest.Mock).mockResolvedValue([{ id: 'assign-new' }, true]);

    await processColocation(buildColocation() as any, now);

    expect(TaskAssignment.update).toHaveBeenCalledWith(
      { status: 'manquée' },
      expect.objectContaining({
        where: expect.objectContaining({ taskId: 'task-1', status: 'à faire' }),
      })
    );
    expect(TaskAssignment.findOrCreate).toHaveBeenCalledTimes(1);
  });

  it("ne crée pas de doublon si l'assignation existe déjà (idempotence)", async () => {
    (Task.findAll as jest.Mock).mockResolvedValue([
      { id: 'task-1', recurringInterval: 'weekly', title: 'Aspirateur', weight: 1 },
    ]);
    (Membership.findAll      as jest.Mock).mockResolvedValue([{ userId: 'user-A' }]);
    (TaskAssignment.findAll  as jest.Mock).mockResolvedValue([]);
    (TaskAssignment.update   as jest.Mock).mockResolvedValue([0]);
    // created = false → assignation déjà existante → continue sans notifier
    (TaskAssignment.findOrCreate as jest.Mock).mockResolvedValue([{ id: 'assign-existing' }, false]);

    await processColocation(buildColocation() as any, now);

    expect(TaskAssignment.findOrCreate).toHaveBeenCalledTimes(1);
  });

  it("saute une tâche sans recurringInterval", async () => {
    (Task.findAll as jest.Mock).mockResolvedValue([
      { id: 'task-1', recurringInterval: null, title: 'Ponctuelle', weight: 1 },
    ]);
    (Membership.findAll as jest.Mock).mockResolvedValue([{ userId: 'user-A' }]);

    await processColocation(buildColocation() as any, now);

    expect(TaskAssignment.update).not.toHaveBeenCalled();
    expect(TaskAssignment.findOrCreate).not.toHaveBeenCalled();
  });
});