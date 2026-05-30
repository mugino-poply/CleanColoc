import {
  completeTask,
  deleteAssignment,
  transferAssignment,
  assignTask,
  getColocationAssignments,
} from '../controllers/assignmentController';
import TaskAssignment from '../models/TaskAssignment';
import Membership    from '../models/Membership';
import sequelize     from '../config/database';

jest.mock('../models/TaskAssignment', () => ({
  __esModule: true,
  default: {
    create:   jest.fn(),
    findByPk: jest.fn(),
    findAll:  jest.fn(),
    update:   jest.fn(),
    destroy:  jest.fn(),
    count:    jest.fn(),
  },
}));

jest.mock('../models/Membership', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
}));

jest.mock('../models/Task', () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
  },
}));

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn(),
    query:       jest.fn(),
  },
}));

jest.mock('../services/rotationService', () => ({
  regenerateForColocation: jest.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildReq = (overrides: Record<string, any> = {}): any => ({
  body:         {},
  params:       {},
  query:        {},
  user:         { id: 'user-uuid-1' },
  colocationId: 'coloc-uuid-1',
  ...overrides,
});

const buildRes = (): any => {
  const r: any = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json   = jest.fn().mockReturnValue(r);
  r.send   = jest.fn().mockReturnValue(r);
  return r;
};

const buildNext = (): jest.Mock => jest.fn();

// ─── completeTask ─────────────────────────────────────────────────────────────

describe('completeTask', () => {
  const makeAssignment = (status: string) => ({
    id:           'assign-1',
    status,
    colocationId: 'coloc-1',
    userId:       'user-1',
  });

  beforeEach(() => jest.clearAllMocks());

  it("marque 'à faire' comme 'terminée' et retourne 200", async () => {
    const refreshed = { id: 'assign-1', status: 'terminée', completedAt: new Date() };
    (TaskAssignment.update  as jest.Mock).mockResolvedValue([1]);
    (TaskAssignment.findByPk as jest.Mock).mockResolvedValue(refreshed);

    const r = buildRes();
    await completeTask(buildReq({ assignment: makeAssignment('à faire') }), r, buildNext());

    expect(TaskAssignment.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'terminée' }),
      expect.objectContaining({ where: expect.objectContaining({ id: 'assign-1' }) })
    );
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(refreshed);
  });

  it("retourne 409 si race condition lors du marquage 'terminée'", async () => {
    (TaskAssignment.update as jest.Mock).mockResolvedValue([0]);

    const r = buildRes();
    await completeTask(buildReq({ assignment: makeAssignment('à faire') }), r, buildNext());

    expect(r.status).toHaveBeenCalledWith(409);
    // L'early return doit empêcher l'appel à findByPk
    expect(TaskAssignment.findByPk).not.toHaveBeenCalled();
  });

  it("rouvre une tâche 'terminée' vers 'à faire' et retourne 200", async () => {
    const refreshed = { id: 'assign-1', status: 'à faire', completedAt: null };
    (TaskAssignment.update  as jest.Mock).mockResolvedValue([1]);
    (TaskAssignment.findByPk as jest.Mock).mockResolvedValue(refreshed);

    const r = buildRes();
    await completeTask(buildReq({ assignment: makeAssignment('terminée') }), r, buildNext());

    expect(TaskAssignment.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'à faire' }),
      expect.objectContaining({ where: expect.objectContaining({ status: 'terminée' }) })
    );
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it("retourne 409 si race condition lors de la réouverture", async () => {
    (TaskAssignment.update as jest.Mock).mockResolvedValue([0]);

    const r = buildRes();
    await completeTask(buildReq({ assignment: makeAssignment('terminée') }), r, buildNext());

    expect(r.status).toHaveBeenCalledWith(409);
    expect(TaskAssignment.findByPk).not.toHaveBeenCalled();
  });
});

// ─── deleteAssignment ─────────────────────────────────────────────────────────

describe('deleteAssignment', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 400 si le statut est 'terminée'", async () => {
    const assignment = { id: 'a-1', status: 'terminée', destroy: jest.fn() };
    const r = buildRes();
    await deleteAssignment(buildReq({ assignment }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
    expect(assignment.destroy).not.toHaveBeenCalled();
  });

  it("retourne 400 si le statut est 'manquée'", async () => {
    const assignment = { id: 'a-1', status: 'manquée', destroy: jest.fn() };
    const r = buildRes();
    await deleteAssignment(buildReq({ assignment }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
    expect(assignment.destroy).not.toHaveBeenCalled();
  });

  it("soft-delete l'assignation 'à faire' et retourne 204", async () => {
    const assignment = { id: 'a-1', status: 'à faire', destroy: jest.fn().mockResolvedValue(undefined) };
    const r = buildRes();
    await deleteAssignment(buildReq({ assignment }), r, buildNext());
    expect(assignment.destroy).toHaveBeenCalledTimes(1);
    expect(r.status).toHaveBeenCalledWith(204);
    expect(r.send).toHaveBeenCalled();
  });
});

// ─── transferAssignment ───────────────────────────────────────────────────────

describe('transferAssignment', () => {
  let mockT: { commit: jest.Mock; rollback: jest.Mock };

  const baseAssignment = {
    id:           'assign-1',
    status:       'à faire',
    colocationId: 'coloc-1',
    userId:       'user-A',
    update:       jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockT = {
      commit:   jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };
    (sequelize.transaction as jest.Mock).mockResolvedValue(mockT);
    baseAssignment.update.mockResolvedValue(undefined);
  });

  it("retourne 400 si la tâche est déjà terminée", async () => {
    const assignment = { ...baseAssignment, status: 'terminée' };
    const r = buildRes();
    await transferAssignment(
      buildReq({ assignment, user: { id: 'user-A' }, body: { toUserId: 'user-B' } }),
      r, buildNext()
    );
    expect(mockT.rollback).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it("retourne 400 si toUserId est absent", async () => {
    const r = buildRes();
    await transferAssignment(
      buildReq({ assignment: baseAssignment, user: { id: 'user-A' }, body: {} }),
      r, buildNext()
    );
    expect(mockT.rollback).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it("retourne 403 si le requester n'est ni l'assigné ni la cible", async () => {
    const r = buildRes();
    await transferAssignment(
      buildReq({ assignment: baseAssignment, user: { id: 'user-C' }, body: { toUserId: 'user-B' } }),
      r, buildNext()
    );
    expect(mockT.rollback).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(403);
  });

  it("retourne 400 si transfert vers soi-même", async () => {
    const r = buildRes();
    await transferAssignment(
      buildReq({ assignment: baseAssignment, user: { id: 'user-A' }, body: { toUserId: 'user-A' } }),
      r, buildNext()
    );
    expect(mockT.rollback).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('déjà attribuée') })
    );
  });

  it("retourne 400 si la cible n'est pas membre", async () => {
    (Membership.findOne as jest.Mock).mockResolvedValue(null);
    const r = buildRes();
    await transferAssignment(
      buildReq({ assignment: baseAssignment, user: { id: 'user-A' }, body: { toUserId: 'user-B' } }),
      r, buildNext()
    );
    expect(mockT.rollback).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it("transfère l'assignation et retourne 200", async () => {
    (Membership.findOne  as jest.Mock).mockResolvedValue({ id: 'membership-B' });
    const refreshed = { id: 'assign-1', userId: 'user-B', status: 'à faire' };
    (TaskAssignment.findByPk as jest.Mock).mockResolvedValue(refreshed);

    const r = buildRes();
    await transferAssignment(
      buildReq({ assignment: baseAssignment, user: { id: 'user-A' }, body: { toUserId: 'user-B' } }),
      r, buildNext()
    );

    expect(baseAssignment.update).toHaveBeenCalledWith(
      { userId: 'user-B', transferredFromUserId: 'user-A', generationMethod: 'manual' },
      { transaction: mockT }
    );
    expect(mockT.commit).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(refreshed);
  });
});

// ─── assignTask ───────────────────────────────────────────────────────────────

describe('assignTask', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 400 si la tâche est terminée", async () => {
    const assignment = { id: 'a-1', status: 'terminée', colocationId: 'coloc-1', userId: 'user-A', update: jest.fn() };
    const r = buildRes();
    await assignTask(buildReq({ assignment, body: { userId: 'user-B' } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it("retourne 400 si userId est absent du body", async () => {
    const assignment = { id: 'a-1', status: 'à faire', colocationId: 'coloc-1', userId: 'user-A', update: jest.fn() };
    const r = buildRes();
    await assignTask(buildReq({ assignment, body: {} }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('userId') })
    );
  });

  it("retourne 400 si userId est null (désassignation refusée)", async () => {
    const assignment = { id: 'a-1', status: 'à faire', colocationId: 'coloc-1', userId: 'user-A', update: jest.fn() };
    const r = buildRes();
    await assignTask(buildReq({ assignment, body: { userId: null } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it("retourne 400 si la cible n'est pas membre", async () => {
    (Membership.findOne as jest.Mock).mockResolvedValue(null);
    const assignment = { id: 'a-1', status: 'à faire', colocationId: 'coloc-1', userId: 'user-A', update: jest.fn() };
    const r = buildRes();
    await assignTask(buildReq({ assignment, body: { userId: 'user-B' } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it("assigne la tâche et retourne 200", async () => {
    (Membership.findOne   as jest.Mock).mockResolvedValue({ id: 'membership-B' });
    const refreshed = { id: 'a-1', userId: 'user-B', status: 'à faire' };
    (TaskAssignment.findByPk as jest.Mock).mockResolvedValue(refreshed);

    const assignment = {
      id: 'a-1', status: 'à faire', colocationId: 'coloc-1', userId: 'user-A',
      update: jest.fn().mockResolvedValue(undefined),
    };
    const r = buildRes();
    await assignTask(buildReq({ assignment, body: { userId: 'user-B' } }), r, buildNext());

    expect(assignment.update).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-B', generationMethod: 'manual' })
    );
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(refreshed);
  });
});

// ─── getColocationAssignments — validation des filtres ────────────────────────

describe('getColocationAssignments — validation des filtres', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 400 si status est invalide", async () => {
    const r = buildRes();
    await getColocationAssignments(
      buildReq({ colocationId: 'coloc-1', query: { status: 'inconnu' } }),
      r, buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('status') })
    );
  });

  it("retourne 400 si period est invalide", async () => {
    const r = buildRes();
    await getColocationAssignments(
      buildReq({ colocationId: 'coloc-1', query: { period: 'yesterday' } }),
      r, buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it("retourne 200 avec la liste des assignations", async () => {
    const assignments = [
      { id: 'a-1', status: 'à faire' },
      { id: 'a-2', status: 'terminée' },
    ];
    (TaskAssignment.findAll as jest.Mock).mockResolvedValue(assignments);

    const r = buildRes();
    await getColocationAssignments(
      buildReq({ colocationId: 'coloc-1', query: {} }),
      r, buildNext()
    );

    expect(TaskAssignment.findAll).toHaveBeenCalledTimes(1);
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(assignments);
  });
});