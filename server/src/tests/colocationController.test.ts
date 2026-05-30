import {
  createColocation,
  joinColocation,
  updateColocationInfo,
  getColocationById,
  getMyColocation,
  updateColocationSettings,
  getColocationMembers,
  regenerateInviteCode,
  transferAdmin,
  removeMember,
} from '../controllers/colocationController';
import Colocation     from '../models/Colocation';
import Membership     from '../models/Membership';
import TaskAssignment from '../models/TaskAssignment';

jest.mock('../models/Colocation', () => ({
  __esModule: true,
  default: {
    create:   jest.fn(),
    findByPk: jest.fn(),
    findOne:  jest.fn(),
    findAll:  jest.fn(),
  },
}));

jest.mock('../models/Membership', () => ({
  __esModule: true,
  default: {
    create:  jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('../models/user', () => ({
  __esModule: true,
  default: { findAll: jest.fn() },
}));

jest.mock('../models/TaskAssignment', () => ({
  __esModule: true,
  default: { destroy: jest.fn() },
}));

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn().mockImplementation(async (cb?: any) => {
      const t = { commit: jest.fn(), rollback: jest.fn() };
      return typeof cb === 'function' ? cb(t) : t;
    }),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildReq = (overrides: Record<string, any> = {}): any => ({
  body:   {},
  params: {},
  query:  {},
  user:   { id: 'user-uuid-1' },
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

// ─── createColocation ─────────────────────────────────────────────────────────

describe('createColocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Colocation.findOne as jest.Mock).mockResolvedValue(null);
  });

  it("retourne 401 si userId est absent", async () => {
    const r = buildRes();
    await createColocation(buildReq({ user: undefined, body: { name: 'Ma Coloc' } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(401);
  });

  it("retourne 400 si name est absent", async () => {
    const r = buildRes();
    await createColocation(buildReq({ body: {} }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('nom') })
    );
  });

  it("retourne 400 si name est composé uniquement d'espaces", async () => {
    const r = buildRes();
    await createColocation(buildReq({ body: { name: '   ' } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it("retourne 409 si l'user est déjà membre actif d'une colocation", async () => {
    (Membership.findOne as jest.Mock).mockResolvedValue({ id: 'membership-1', deletedAt: null });
    const r = buildRes();
    await createColocation(buildReq({ body: { name: 'Ma Coloc' } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(409);
    expect(Colocation.create).not.toHaveBeenCalled();
  });

  it("crée la colocation et le membership, retourne 201", async () => {
    const mockColoc = { id: 'coloc-1', name: 'Ma Coloc', inviteCode: 'ABCD1234' };
    (Membership.findOne as jest.Mock).mockResolvedValue(null);
    (Colocation.create  as jest.Mock).mockResolvedValue(mockColoc);
    (Membership.create  as jest.Mock).mockResolvedValue({ id: 'membership-new' });

    const r = buildRes();
    await createColocation(buildReq({ body: { name: 'Ma Coloc', description: 'Belle coloc' } }), r, buildNext());

    expect(Colocation.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Ma Coloc' })
    );
    expect(Membership.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1', colocationId: 'coloc-1', role: 'admin' })
    );
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalledWith(mockColoc);
  });

  it("restaure un membership soft-deleted si l'user a déjà appartenu à une coloc", async () => {
    const softDeleted = {
      id:        'membership-old',
      deletedAt: new Date('2024-01-01'),
      restore:   jest.fn().mockResolvedValue(undefined),
      update:    jest.fn().mockResolvedValue(undefined),
    };
    const mockColoc = { id: 'coloc-2', name: 'Nouvelle Coloc', inviteCode: 'XYZ99999' };
    (Membership.findOne as jest.Mock).mockResolvedValue(softDeleted);
    (Colocation.create  as jest.Mock).mockResolvedValue(mockColoc);

    const r = buildRes();
    await createColocation(buildReq({ body: { name: 'Nouvelle Coloc' } }), r, buildNext());

    expect(softDeleted.restore).toHaveBeenCalled();
    expect(softDeleted.update).toHaveBeenCalledWith(
      expect.objectContaining({ colocationId: 'coloc-2', role: 'admin' })
    );
    expect(Membership.create).not.toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(201);
  });
});

// ─── joinColocation ───────────────────────────────────────────────────────────

describe('joinColocation', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 400 si inviteCode est absent", async () => {
    const r = buildRes();
    await joinColocation(buildReq({ body: {} }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("code d'invitation") })
    );
  });

  it("retourne 409 si l'user est déjà membre actif", async () => {
    (Membership.findOne as jest.Mock).mockResolvedValue({ id: 'membership-1', deletedAt: null });
    const r = buildRes();
    await joinColocation(buildReq({ body: { inviteCode: 'ABCD1234' } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(409);
  });

  it("retourne 404 si le code d'invitation est invalide", async () => {
    (Membership.findOne  as jest.Mock).mockResolvedValue(null);
    (Colocation.findOne as jest.Mock).mockResolvedValue(null);
    const r = buildRes();
    await joinColocation(buildReq({ body: { inviteCode: 'BADCODE0' } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(404);
  });

  it("rejoint la colocation et retourne 200", async () => {
    const mockColoc = { id: 'coloc-1', name: 'La Coloc', inviteCode: 'ABCD1234' };
    (Membership.findOne  as jest.Mock).mockResolvedValue(null);
    (Colocation.findOne as jest.Mock).mockResolvedValue(mockColoc);
    (Membership.create  as jest.Mock).mockResolvedValue({ id: 'membership-new' });

    const r = buildRes();
    await joinColocation(buildReq({ body: { inviteCode: 'abcd1234' } }), r, buildNext());

    expect(Colocation.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ inviteCode: 'ABCD1234' }) })
    );
    expect(Membership.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1', colocationId: 'coloc-1', role: 'member' })
    );
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(mockColoc);
  });
});

// ─── updateColocationInfo ─────────────────────────────────────────────────────

describe('updateColocationInfo', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 400 si aucun champ n'est fourni", async () => {
    const r = buildRes();
    await updateColocationInfo(buildReq({ body: {}, params: { id: 'coloc-1' } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it("retourne 400 si name est une chaîne vide", async () => {
    const r = buildRes();
    await updateColocationInfo(
      buildReq({ body: { name: '  ' }, params: { id: 'coloc-1' } }),
      r, buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it("retourne 404 si la colocation n'existe pas", async () => {
    (Colocation.findByPk as jest.Mock).mockResolvedValue(null);
    const r = buildRes();
    await updateColocationInfo(
      buildReq({ body: { name: 'Nouveau nom' }, params: { id: 'coloc-ghost' } }),
      r, buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(404);
  });

  it("met à jour le nom et retourne 200", async () => {
    const mockColoc = {
      id:           'coloc-1',
      name:         'Ancien nom',
      description:  'Desc',
      inviteCode:   'ABCD1234',
      autoRotation: false,
      updatedAt:    new Date(),
      update: jest.fn().mockImplementation(function(this: any, updates: any) {
        Object.assign(this, updates);
        return Promise.resolve(this);
      }),
    };
    (Colocation.findByPk as jest.Mock).mockResolvedValue(mockColoc);

    const r = buildRes();
    await updateColocationInfo(
      buildReq({ body: { name: 'Nouveau nom' }, params: { id: 'coloc-1' } }),
      r, buildNext()
    );

    expect(mockColoc.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Nouveau nom' })
    );
    expect(r.status).toHaveBeenCalledWith(200);
  });
});

// ─── getMyColocation ──────────────────────────────────────────────────────────

describe('getMyColocation', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 404 si l'user n'appartient à aucune colocation", async () => {
    (Membership.findOne as jest.Mock).mockResolvedValue(null);
    const r = buildRes();
    await getMyColocation(buildReq(), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(404);
  });

  it("retourne 200 avec la colocation et le rôle", async () => {
    const mockMembership = {
      id:         'membership-1',
      role:       'admin',
      colocation: { id: 'coloc-1', name: 'La Coloc', inviteCode: 'ABCD1234' },
    };
    (Membership.findOne as jest.Mock).mockResolvedValue(mockMembership);

    const r = buildRes();
    await getMyColocation(buildReq(), r, buildNext());

    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith({
      colocation: mockMembership.colocation,
      role:       'admin',
    });
  });
});

// ─── getColocationById ────────────────────────────────────────────────────────

describe('getColocationById', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 403 si l'user n'est pas membre", async () => {
    (Membership.findOne as jest.Mock).mockResolvedValue(null);
    const r = buildRes();
    await getColocationById(buildReq({ params: { id: 'coloc-1' } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(403);
  });

  it("retourne 404 si la colocation est introuvable", async () => {
    (Membership.findOne  as jest.Mock).mockResolvedValue({ id: 'membership-1' });
    (Colocation.findByPk as jest.Mock).mockResolvedValue(null);

    const r = buildRes();
    await getColocationById(buildReq({ params: { id: 'coloc-ghost' } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(404);
  });

  it("retourne 200 avec la colocation", async () => {
    const mockColoc = { id: 'coloc-1', name: 'La Coloc', inviteCode: 'ABCD1234' };
    (Membership.findOne  as jest.Mock).mockResolvedValue({ id: 'membership-1' });
    (Colocation.findByPk as jest.Mock).mockResolvedValue(mockColoc);

    const r = buildRes();
    await getColocationById(buildReq({ params: { id: 'coloc-1' } }), r, buildNext());

    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(mockColoc);
  });
});

// ─── updateColocationSettings ─────────────────────────────────────────────────

describe('updateColocationSettings', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 400 si autoRotation n'est pas un booléen", async () => {
    const r = buildRes();
    await updateColocationSettings(
      buildReq({ body: { autoRotation: 'oui' }, params: { id: 'coloc-1' } }),
      r, buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
    expect(Colocation.findByPk).not.toHaveBeenCalled();
  });

  it("retourne 404 si la colocation est introuvable", async () => {
    (Colocation.findByPk as jest.Mock).mockResolvedValue(null);
    const r = buildRes();
    await updateColocationSettings(
      buildReq({ body: { autoRotation: true }, params: { id: 'ghost' } }),
      r, buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(404);
  });

  it("met à jour autoRotation et retourne 200", async () => {
    const mockColoc = {
      id: 'coloc-1', autoRotation: false,
      update: jest.fn().mockImplementation(function(this: any, u: any) {
        Object.assign(this, u); return Promise.resolve();
      }),
    };
    (Colocation.findByPk as jest.Mock).mockResolvedValue(mockColoc);

    const r = buildRes();
    await updateColocationSettings(
      buildReq({ body: { autoRotation: true }, params: { id: 'coloc-1' } }),
      r, buildNext()
    );
    expect(mockColoc.update).toHaveBeenCalledWith({ autoRotation: true });
    expect(r.status).toHaveBeenCalledWith(200);
  });
});

// ─── getColocationMembers ─────────────────────────────────────────────────────

describe('getColocationMembers', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne les membres triés (admin en premier, puis ordre alpha)", async () => {
    (Membership.findAll as jest.Mock).mockResolvedValue([
      { id: 'm-1', role: 'member',  createdAt: new Date(), User: { id: 'user-B', username: 'Bob',   avatarUrl: null } },
      { id: 'm-2', role: 'admin',   createdAt: new Date(), User: { id: 'user-A', username: 'Alice', avatarUrl: null } },
    ]);

    const r = buildRes();
    await getColocationMembers(buildReq({ params: { id: 'coloc-1' } }), r, buildNext());

    expect(r.status).toHaveBeenCalledWith(200);
    const body = r.json.mock.calls[0][0];
    expect(body[0].role).toBe('admin');
    expect(body[1].role).toBe('member');
  });

  it("retourne un tableau vide si aucun membre", async () => {
    (Membership.findAll as jest.Mock).mockResolvedValue([]);
    const r = buildRes();
    await getColocationMembers(buildReq({ params: { id: 'coloc-1' } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith([]);
  });
});

// ─── regenerateInviteCode ─────────────────────────────────────────────────────

describe('regenerateInviteCode', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 404 si la colocation est introuvable", async () => {
    (Colocation.findByPk as jest.Mock).mockResolvedValue(null);
    (Colocation.findOne  as jest.Mock).mockResolvedValue(null);
    const r = buildRes();
    await regenerateInviteCode(buildReq({ params: { id: 'ghost' } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(404);
  });

  it("génère un nouveau code et retourne 200", async () => {
    const mockColoc = {
      id:     'coloc-1',
      update: jest.fn().mockResolvedValue(undefined),
    };
    (Colocation.findByPk as jest.Mock).mockResolvedValue(mockColoc);
    (Colocation.findOne  as jest.Mock).mockResolvedValue(null);

    const r = buildRes();
    await regenerateInviteCode(buildReq({ params: { id: 'coloc-1' } }), r, buildNext());

    expect(mockColoc.update).toHaveBeenCalledWith(
      expect.objectContaining({ inviteCode: expect.any(String) })
    );
    expect(r.status).toHaveBeenCalledWith(200);
    const body = r.json.mock.calls[0][0];
    expect(body).toHaveProperty('inviteCode');
    expect(typeof body.inviteCode).toBe('string');
    expect(body.inviteCode).toHaveLength(8);
  });
});

// ─── transferAdmin ────────────────────────────────────────────────────────────

describe('transferAdmin', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 400 si toUserId est absent", async () => {
    const r = buildRes();
    await transferAdmin(
      buildReq({ params: { id: 'coloc-1' }, body: {} }),
      r, buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it("retourne 400 si toUserId est le requester lui-même", async () => {
    const r = buildRes();
    await transferAdmin(
      buildReq({ params: { id: 'coloc-1' }, body: { toUserId: 'user-uuid-1' }, user: { id: 'user-uuid-1' } }),
      r, buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('déjà administrateur') })
    );
  });

  it("retourne 400 si la cible n'est pas membre", async () => {
    (Membership.findOne as jest.Mock).mockResolvedValue(null);
    const r = buildRes();
    await transferAdmin(
      buildReq({ params: { id: 'coloc-1' }, body: { toUserId: 'user-B' }, user: { id: 'user-uuid-1' } }),
      r, buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it("retourne 400 si la cible est déjà admin", async () => {
    (Membership.findOne as jest.Mock).mockResolvedValue({ id: 'm-B', role: 'admin', update: jest.fn() });
    const r = buildRes();
    await transferAdmin(
      buildReq({ params: { id: 'coloc-1' }, body: { toUserId: 'user-B' }, user: { id: 'user-uuid-1' } }),
      r, buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('déjà administrateur') })
    );
  });

  it("transfère le rôle admin et retourne 200", async () => {
    const targetMembership    = { id: 'm-B', role: 'member', update: jest.fn().mockResolvedValue(undefined) };
    const requesterMembership = { id: 'm-A', role: 'admin',  update: jest.fn().mockResolvedValue(undefined) };

    (Membership.findOne as jest.Mock)
      .mockResolvedValueOnce(targetMembership)
      .mockResolvedValueOnce(requesterMembership);

    const r = buildRes();
    await transferAdmin(
      buildReq({ params: { id: 'coloc-1' }, body: { toUserId: 'user-B' }, user: { id: 'user-uuid-1' } }),
      r, buildNext()
    );

    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ membership: expect.objectContaining({ role: 'admin' }) })
    );
  });
});

// ─── removeMember ─────────────────────────────────────────────────────────────

describe('removeMember', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 400 si userId n'est pas un UUID valide", async () => {
    const r = buildRes();
    await removeMember(
      buildReq({ params: { id: 'coloc-1', userId: 'pas-un-uuid' }, user: { id: 'user-uuid-1' } }),
      r, buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('UUID') })
    );
  });

  it("retourne 400 si le requester essaie de se retirer lui-même", async () => {
    const sameUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const r = buildRes();
    await removeMember(
      buildReq({ params: { id: 'coloc-1', userId: sameUuid }, user: { id: sameUuid } }),
      r, buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it("retourne 404 si le membre n'est pas dans la colocation", async () => {
    (Membership.findOne as jest.Mock).mockResolvedValue(null);
    const r = buildRes();
    await removeMember(
      buildReq({
        params: { id: 'coloc-1', userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
        user:   { id: 'user-uuid-1' },
      }),
      r, buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(404);
  });

  it("retire le membre et ses assignations 'à faire', retourne 200", async () => {
    const memberUuid     = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const mockMembership = { id: 'm-1', destroy: jest.fn().mockResolvedValue(undefined) };
    (Membership.findOne      as jest.Mock).mockResolvedValue(mockMembership);
    (TaskAssignment.destroy  as jest.Mock).mockResolvedValue(2);

    const r = buildRes();
    await removeMember(
      buildReq({ params: { id: 'coloc-1', userId: memberUuid }, user: { id: 'user-uuid-1' } }),
      r, buildNext()
    );

    expect(mockMembership.destroy).toHaveBeenCalledTimes(1);
    expect(TaskAssignment.destroy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: memberUuid, status: 'à faire' }),
      })
    );
    expect(r.status).toHaveBeenCalledWith(200);
  });
});