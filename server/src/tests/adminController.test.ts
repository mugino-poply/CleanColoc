import {
  getStats,
  listUsers,
  deleteUser,
  listColocations,
  deleteColocation,
  listTasks,
  listAssignments,
} from '../controllers/Admincontroller';
import User           from '../models/user';
import Colocation     from '../models/Colocation';
import Membership     from '../models/Membership';
import Task           from '../models/Task';
import TaskAssignment from '../models/TaskAssignment';

jest.mock('../models/user', () => ({
  __esModule: true,
  default: {
    count:           jest.fn(),
    findAll:         jest.fn(),
    findByPk:        jest.fn(),
    findAndCountAll: jest.fn(),
  },
}));

jest.mock('../models/Colocation', () => ({
  __esModule: true,
  default: {
    count:    jest.fn(),
    findAll:  jest.fn(),
    findByPk: jest.fn(),
  },
}));

jest.mock('../models/Membership', () => ({
  __esModule: true,
  default: {
    count:   jest.fn(),
    findAll: jest.fn(),
  },
}));

jest.mock('../models/Task', () => ({
  __esModule: true,
  default: {
    count:   jest.fn(),
    findAll: jest.fn(),
  },
}));

jest.mock('../models/TaskAssignment', () => ({
  __esModule: true,
  default: {
    count:   jest.fn(),
    findAll: jest.fn(),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildReq = (overrides: Record<string, any> = {}): any => ({
  body:   {},
  params: {},
  query:  {},
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

// ─── getStats ─────────────────────────────────────────────────────────────────

describe('getStats', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne les compteurs agrégés et les utilisateurs récents", async () => {
    (User.count           as jest.Mock).mockResolvedValue(42);
    (Colocation.count     as jest.Mock).mockResolvedValue(10);
    (Task.count           as jest.Mock).mockResolvedValue(88);
    (TaskAssignment.count as jest.Mock).mockResolvedValue(200);

    const recentUsers = [
      { id: 'u-1', username: 'Alice', email: 'alice@test.com', createdAt: new Date() },
    ];
    (User.findAll as jest.Mock).mockResolvedValue(recentUsers);

    const r = buildRes();
    await getStats(buildReq(), r, buildNext());

    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith({
      totalUsers:       42,
      totalColocations: 10,
      totalTasks:       88,
      totalAssignments: 200,
      recentUsers,
    });
  });

  it("propage l'erreur via next() en cas d'échec", async () => {
    const err = new Error('DB down');
    (User.count as jest.Mock).mockRejectedValue(err);

    const n = buildNext();
    await getStats(buildReq(), buildRes(), n);
    expect(n).toHaveBeenCalledWith(err);
  });
});

// ─── listUsers ────────────────────────────────────────────────────────────────

describe('listUsers', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne la liste paginée des utilisateurs", async () => {
    const users = [{ id: 'u-1', username: 'Alice' }];
    (User.findAndCountAll as jest.Mock).mockResolvedValue({ count: 1, rows: users });

    const r = buildRes();
    await listUsers(buildReq({ query: { page: '1', limit: '30' } }), r, buildNext());

    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        users,
        total:      1,
        page:       1,
        totalPages: 1,
      })
    );
  });

  it("applique les valeurs de pagination par défaut (page=1, limit=30)", async () => {
    (User.findAndCountAll as jest.Mock).mockResolvedValue({ count: 0, rows: [] });

    const r = buildRes();
    await listUsers(buildReq({ query: {} }), r, buildNext());

    const callArgs = (User.findAndCountAll as jest.Mock).mock.calls[0]?.[0];
    expect(callArgs.limit).toBe(30);
    expect(callArgs.offset).toBe(0);
  });

  it("calcule le bon offset pour la page 2", async () => {
    (User.findAndCountAll as jest.Mock).mockResolvedValue({ count: 60, rows: [] });

    await listUsers(buildReq({ query: { page: '2', limit: '30' } }), buildRes(), buildNext());

    const callArgs = (User.findAndCountAll as jest.Mock).mock.calls[0]?.[0];
    expect(callArgs.offset).toBe(30);
  });
});

// ─── deleteUser ───────────────────────────────────────────────────────────────

describe('deleteUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 404 si l'utilisateur n'existe pas", async () => {
    (User.findByPk as jest.Mock).mockResolvedValue(null);

    const r = buildRes();
    await deleteUser(buildReq({ params: { id: 'ghost-uuid' } }), r, buildNext());

    expect(r.status).toHaveBeenCalledWith(404);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('introuvable') })
    );
  });

  it("soft-delete l'utilisateur et retourne 200", async () => {
    const mockUser = {
      id:     'user-1',
      update: jest.fn().mockResolvedValue(undefined),
    };
    (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

    const r = buildRes();
    await deleteUser(buildReq({ params: { id: 'user-1' } }), r, buildNext());

    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ deletedAt: expect.any(Date) })
    );
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('supprimé') })
    );
  });
});

// ─── listColocations ──────────────────────────────────────────────────────────

describe('listColocations', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne les colocations enrichies avec memberCount et taskCount", async () => {
    const mockColoc = {
      id:        'coloc-1',
      name:      'La Coloc',
      toJSON:    () => ({ id: 'coloc-1', name: 'La Coloc' }),
    };
    (Colocation.findAll  as jest.Mock).mockResolvedValue([mockColoc]);
    (Membership.count    as jest.Mock).mockResolvedValue(3);
    (Task.count          as jest.Mock).mockResolvedValue(7);

    const r = buildRes();
    await listColocations(buildReq(), r, buildNext());

    expect(r.status).toHaveBeenCalledWith(200);
    const body = r.json.mock.calls[0][0];
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ id: 'coloc-1', memberCount: 3, taskCount: 7 });
  });

  it("retourne un tableau vide si aucune colocation n'existe", async () => {
    (Colocation.findAll as jest.Mock).mockResolvedValue([]);

    const r = buildRes();
    await listColocations(buildReq(), r, buildNext());

    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith([]);
  });
});

// ─── deleteColocation ─────────────────────────────────────────────────────────

describe('deleteColocation', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 404 si la colocation n'existe pas", async () => {
    (Colocation.findByPk as jest.Mock).mockResolvedValue(null);

    const r = buildRes();
    await deleteColocation(buildReq({ params: { id: 'ghost-uuid' } }), r, buildNext());

    expect(r.status).toHaveBeenCalledWith(404);
  });

  it("soft-delete la colocation et retourne 200", async () => {
    const mockColoc = {
      id:     'coloc-1',
      update: jest.fn().mockResolvedValue(undefined),
    };
    (Colocation.findByPk as jest.Mock).mockResolvedValue(mockColoc);

    const r = buildRes();
    await deleteColocation(buildReq({ params: { id: 'coloc-1' } }), r, buildNext());

    expect(mockColoc.update).toHaveBeenCalledWith(
      expect.objectContaining({ deletedAt: expect.any(Date) })
    );
    expect(r.status).toHaveBeenCalledWith(200);
  });
});

// ─── listTasks ────────────────────────────────────────────────────────────────

describe('listTasks', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne la liste des tâches avec leur colocation", async () => {
    const tasks = [
      { id: 't-1', title: 'Nettoyer', colocation: { name: 'La Coloc' } },
      { id: 't-2', title: 'Cuisiner', colocation: { name: 'La Coloc' } },
    ];
    (Task.findAll as jest.Mock).mockResolvedValue(tasks);

    const r = buildRes();
    await listTasks(buildReq(), r, buildNext());

    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(tasks);
  });
});

// ─── listAssignments ──────────────────────────────────────────────────────────

describe('listAssignments', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne la liste des assignations avec user et colocation", async () => {
    const assignments = [
      {
        id:                'a-1',
        taskTitleSnapshot: 'Nettoyer',
        status:            'terminée',
        user:              { username: 'Alice' },
        colocation:        { name: 'La Coloc' },
      },
    ];
    (TaskAssignment.findAll as jest.Mock).mockResolvedValue(assignments);

    const r = buildRes();
    await listAssignments(buildReq(), r, buildNext());

    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(assignments);
  });
});