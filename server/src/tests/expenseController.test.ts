import {
  createExpense,
  getExpenses,
  deleteExpense,
  getBalances,
} from '../controllers/expenseController';
import Expense      from '../models/Expense';
import ExpenseShare from '../models/ExpenseShare';
import Membership   from '../models/Membership';
import User         from '../models/user';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockTransaction = {
  commit:   jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../models/Expense', () => ({
  __esModule: true,
  default: {
    create:    jest.fn(),
    findByPk:  jest.fn(),
    findAll:   jest.fn(),
    sequelize: {
      transaction: jest.fn(),
    },
  },
}));

jest.mock('../models/ExpenseShare', () => ({
  __esModule: true,
  default: {
    bulkCreate: jest.fn(),
    findAll:    jest.fn(),
    destroy:    jest.fn(),
  },
}));

jest.mock('../models/Membership', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
}));

jest.mock('../models/user', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findAll:  jest.fn(),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildReq = (overrides: Record<string, any> = {}): any => ({
  body:         {},
  params:       {},
  query:        {},
  user:         { id: 'payer-uuid' },
  colocationId: 'coloc-uuid',
  role:         'member',
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

// ─── createExpense ────────────────────────────────────────────────────────────

describe('createExpense', () => {
  const validBody = {
    title:    'Courses',
    amount:   3000,
    category: 'alimentation',
  };

  beforeEach(() => jest.clearAllMocks());

  it('retourne 400 si title est absent', async () => {
    const r = buildRes();
    await createExpense(buildReq({ body: { amount: 1000, category: 'foo' } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('title') })
    );
  });

  it('retourne 400 si amount est absent', async () => {
    const r = buildRes();
    await createExpense(buildReq({ body: { title: 'Test', category: 'foo' } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('amount') })
    );
  });

  it('retourne 400 si amount est 0', async () => {
    const r = buildRes();
    await createExpense(buildReq({ body: { ...validBody, amount: 0 } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it('retourne 400 si amount est négatif', async () => {
    const r = buildRes();
    await createExpense(buildReq({ body: { ...validBody, amount: -500 } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it('retourne 400 si amount est un float', async () => {
    const r = buildRes();
    await createExpense(buildReq({ body: { ...validBody, amount: 42.5 } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('centimes') })
    );
  });

  it('retourne 400 si category est absente', async () => {
    const r = buildRes();
    await createExpense(buildReq({ body: { title: 'Test', amount: 1000 } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('category') })
    );
  });

  it('retourne 400 si date est au mauvais format', async () => {
    const r = buildRes();
    await createExpense(
      buildReq({ body: { ...validBody, date: '30/05/2026' } }),
      r, buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('YYYY-MM-DD') })
    );
  });

  it('retourne 400 si memberIds est un tableau vide', async () => {
    const r = buildRes();
    await createExpense(
      buildReq({ body: { ...validBody, memberIds: [] } }),
      r, buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('memberIds') })
    );
  });

  it('retourne 400 si un memberIds ne correspond pas à un membre actif', async () => {
    // findAll retourne 1 seul résultat pour 2 IDs demandés → incohérence
    (Membership.findAll as jest.Mock).mockResolvedValue([{ userId: 'user-A' }]);

    const r = buildRes();
    await createExpense(
      buildReq({ body: { ...validBody, memberIds: ['user-A', 'user-GHOST'] } }),
      r, buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('membres actifs') })
    );
  });

  it('crée la dépense avec parts égales et retourne 201', async () => {
    // 3 membres, 3000 centimes → 1000 chacun, reste = 0
    (Membership.findAll as jest.Mock).mockResolvedValue([
      { userId: 'user-A' },
      { userId: 'user-B' },
      { userId: 'user-C' },
    ]);
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'payer-uuid', username: 'Alice' });
    (User.findAll  as jest.Mock).mockResolvedValue([
      { id: 'user-A', username: 'Alice' },
      { id: 'user-B', username: 'Bob' },
      { id: 'user-C', username: 'Charlie' },
    ]);

    const mockExpense = { id: 'expense-1', title: 'Courses', amount: 3000 };
    const mockShares  = [
      { expenseId: 'expense-1', userId: 'user-A', amount: 1000 },
      { expenseId: 'expense-1', userId: 'user-B', amount: 1000 },
      { expenseId: 'expense-1', userId: 'user-C', amount: 1000 },
    ];
    (Expense.create      as jest.Mock).mockResolvedValue(mockExpense);
    (ExpenseShare.bulkCreate as jest.Mock).mockResolvedValue(mockShares);

    const r = buildRes();
    await createExpense(buildReq({ body: validBody }), r, buildNext());

    expect(Expense.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Courses', amount: 3000, payerId: 'payer-uuid' })
    );
    expect(ExpenseShare.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ userId: 'user-A', amount: 1000 }),
        expect.objectContaining({ userId: 'user-B', amount: 1000 }),
        expect.objectContaining({ userId: 'user-C', amount: 1000 }),
      ])
    );
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalledWith({ expense: mockExpense, shares: mockShares });
  });

  it('attribue le reste au premier membre (100 centimes / 3 membres)', async () => {
    // 100 centimes / 3 = 33 chacun, reste = 1 → premier membre reçoit 34
    (Membership.findAll as jest.Mock).mockResolvedValue([
      { userId: 'user-A' },
      { userId: 'user-B' },
      { userId: 'user-C' },
    ]);
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'payer-uuid', username: 'Alice' });
    (User.findAll  as jest.Mock).mockResolvedValue([
      { id: 'user-A', username: 'Alice' },
      { id: 'user-B', username: 'Bob' },
      { id: 'user-C', username: 'Charlie' },
    ]);
    (Expense.create as jest.Mock).mockResolvedValue({ id: 'expense-2', amount: 100 });
    (ExpenseShare.bulkCreate as jest.Mock).mockResolvedValue([]);

    const r = buildRes();
    await createExpense(
      buildReq({ body: { title: 'Café', amount: 100, category: 'loisir' } }),
      r, buildNext()
    );

    const sharesCalled = (ExpenseShare.bulkCreate as jest.Mock).mock.calls[0]?.[0];
    expect(sharesCalled[0].amount).toBe(34); // 33 + reste 1
    expect(sharesCalled[1].amount).toBe(33);
    expect(sharesCalled[2].amount).toBe(33);
    // Vérification de cohérence : la somme doit être égale au montant total
    const total = sharesCalled.reduce((acc: number, s: any) => acc + s.amount, 0);
    expect(total).toBe(100);
  });

  it("propage l'erreur via next() en cas d'échec DB", async () => {
    (Membership.findAll as jest.Mock).mockResolvedValue([{ userId: 'user-A' }]);
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'payer-uuid', username: 'Alice' });
    (User.findAll  as jest.Mock).mockResolvedValue([{ id: 'user-A', username: 'Alice' }]);

    const dbError = new Error('Connection lost');
    (Expense.create as jest.Mock).mockRejectedValue(dbError);

    const n = buildNext();
    await createExpense(buildReq({ body: validBody }), buildRes(), n);
    expect(n).toHaveBeenCalledWith(dbError);
  });
});

// ─── getExpenses — validation des filtres ─────────────────────────────────────

describe('getExpenses', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retourne 400 si from est au mauvais format', async () => {
    const r = buildRes();
    await getExpenses(
      buildReq({ colocationId: 'coloc-1', query: { from: '2026/01/01' } }),
      r, buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('YYYY-MM-DD') })
    );
  });

  it('retourne 400 si to est au mauvais format', async () => {
    const r = buildRes();
    await getExpenses(
      buildReq({ colocationId: 'coloc-1', query: { to: '01-01-2026' } }),
      r, buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it('retourne 200 avec la liste des dépenses sans filtre', async () => {
    const expenses = [
      { id: 'e-1', title: 'Loyer',    amount: 60000 },
      { id: 'e-2', title: 'Courses',  amount: 4250  },
    ];
    (Expense.findAll as jest.Mock).mockResolvedValue(expenses);

    const r = buildRes();
    await getExpenses(buildReq({ query: {} }), r, buildNext());

    expect(Expense.findAll).toHaveBeenCalledTimes(1);
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(expenses);
  });
});

// ─── deleteExpense ────────────────────────────────────────────────────────────

describe('deleteExpense', () => {
    beforeEach(() => {
    jest.clearAllMocks();
    ((Expense as any).sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
    });

  const makeExpense = (payerId: string) => ({
    id:       'expense-1',
    payerId,
    destroy:  jest.fn().mockResolvedValue(undefined),
    sequelize: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
  });

  it('retourne 403 si le requester n\'est ni le payeur ni un admin', async () => {
    const expense = makeExpense('other-user');
    const r       = buildRes();
    await deleteExpense(
      buildReq({ expense, user: { id: 'user-X' }, role: 'member' }),
      r, buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(403);
    expect(expense.destroy).not.toHaveBeenCalled();
  });

  it('autorise la suppression si le requester est admin (même pas payeur)', async () => {
    const expense = makeExpense('other-user');
    (ExpenseShare.destroy as jest.Mock).mockResolvedValue(undefined);

    const r = buildRes();
    await deleteExpense(
      buildReq({ expense, user: { id: 'admin-user' }, role: 'admin' }),
      r, buildNext()
    );
    expect(mockTransaction.commit).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(204);
    expect(r.send).toHaveBeenCalled();
  });

  it('supprime les shares ET la dépense dans la même transaction, retourne 204', async () => {
    const expense = makeExpense('payer-uuid');
    (ExpenseShare.destroy as jest.Mock).mockResolvedValue(undefined);

    const r = buildRes();
    await deleteExpense(
      buildReq({ expense, user: { id: 'payer-uuid' }, role: 'member' }),
      r, buildNext()
    );

    expect(ExpenseShare.destroy).toHaveBeenCalledWith(
      expect.objectContaining({
        where:       { expenseId: 'expense-1' },
        transaction: mockTransaction,
      })
    );
    expect(expense.destroy).toHaveBeenCalledWith({ transaction: mockTransaction });
    expect(mockTransaction.commit).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(204);
  });
});

// ─── getBalances — algo de simplification des dettes ─────────────────────────

describe('getBalances', () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne balances vides si la colocation n'a aucun membre", async () => {
    (Membership.findAll as jest.Mock).mockResolvedValue([]);
    const r = buildRes();
    await getBalances(buildReq({ colocationId: 'coloc-1' }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith({ balances: [], debts: [] });
  });

  it('calcule le solde net correct pour chaque membre', async () => {
    // Alice paye 60 € pour 2 personnes → net(Alice) = 60 - 30 = +30 €
    // Bob ne paye rien → net(Bob) = 0 - 30 = -30 €
    (Membership.findAll as jest.Mock).mockResolvedValue([
      { userId: 'alice', User: { id: 'alice', username: 'Alice', avatarUrl: null } },
      { userId: 'bob',   User: { id: 'bob',   username: 'Bob',   avatarUrl: null } },
    ]);
    (Expense.findAll as jest.Mock).mockResolvedValue([
      {
        id:            'e-1',
        amount:        6000,  // 60 €
        payerId:       'alice',
        payerSnapshot: 'Alice',
        shares: [
          { userId: 'alice', userSnapshot: 'Alice', amount: 3000 },
          { userId: 'bob',   userSnapshot: 'Bob',   amount: 3000 },
        ],
      },
    ]);

    const r = buildRes();
    await getBalances(buildReq({ colocationId: 'coloc-1' }), r, buildNext());

    const body = r.json.mock.calls[0][0];
    const aliceBalance = body.balances.find((b: any) => b.userId === 'alice');
    const bobBalance   = body.balances.find((b: any) => b.userId === 'bob');

    expect(aliceBalance.net).toBe(3000);   // Alice est créditrice
    expect(bobBalance.net).toBe(-3000);    // Bob est débiteur
  });

  it("génère la bonne dette simplifiée (Bob doit 30 € à Alice)", async () => {
    (Membership.findAll as jest.Mock).mockResolvedValue([
      { userId: 'alice', User: { id: 'alice', username: 'Alice', avatarUrl: null } },
      { userId: 'bob',   User: { id: 'bob',   username: 'Bob',   avatarUrl: null } },
    ]);
    (Expense.findAll as jest.Mock).mockResolvedValue([
      {
        id:            'e-1',
        amount:        6000,
        payerId:       'alice',
        payerSnapshot: 'Alice',
        shares: [
          { userId: 'alice', userSnapshot: 'Alice', amount: 3000 },
          { userId: 'bob',   userSnapshot: 'Bob',   amount: 3000 },
        ],
      },
    ]);

    const r = buildRes();
    await getBalances(buildReq({ colocationId: 'coloc-1' }), r, buildNext());

    const body = r.json.mock.calls[0][0];
    expect(body.debts).toHaveLength(1);
    expect(body.debts[0]).toMatchObject({
      fromUserId:   'bob',
      fromUsername: 'Bob',
      toUserId:     'alice',
      toUsername:   'Alice',
      amount:       3000,
    });
  });

  it('produit zéro dette si les soldes sont équilibrés', async () => {
    // Alice et Bob se remboursent mutuellement → nets = 0
    (Membership.findAll as jest.Mock).mockResolvedValue([
      { userId: 'alice', User: { id: 'alice', username: 'Alice', avatarUrl: null } },
      { userId: 'bob',   User: { id: 'bob',   username: 'Bob',   avatarUrl: null } },
    ]);
    (Expense.findAll as jest.Mock).mockResolvedValue([
      {
        id:            'e-1',
        amount:        5000,
        payerId:       'alice',
        payerSnapshot: 'Alice',
        shares: [
          { userId: 'alice', userSnapshot: 'Alice', amount: 2500 },
          { userId: 'bob',   userSnapshot: 'Bob',   amount: 2500 },
        ],
      },
      {
        id:            'e-2',
        amount:        5000,
        payerId:       'bob',
        payerSnapshot: 'Bob',
        shares: [
          { userId: 'alice', userSnapshot: 'Alice', amount: 2500 },
          { userId: 'bob',   userSnapshot: 'Bob',   amount: 2500 },
        ],
      },
    ]);

    const r = buildRes();
    await getBalances(buildReq({ colocationId: 'coloc-1' }), r, buildNext());

    const body = r.json.mock.calls[0][0];
    expect(body.debts).toHaveLength(0);
    body.balances.forEach((b: any) => expect(b.net).toBe(0));
  });

  it('simplifie correctement une dette triangulaire (A → B, B → C, C → A)', async () => {
    // Scénario :
    //   Alice paye 120 € pour 3 → net(Alice) = 120 - 40 = +80
    //   Bob paye 0 → net(Bob) = -40
    //   Charlie paye 0 → net(Charlie) = -40
    // Dettes attendues : Bob doit 40 € à Alice, Charlie doit 40 € à Alice (2 dettes)
    (Membership.findAll as jest.Mock).mockResolvedValue([
      { userId: 'alice',   User: { id: 'alice',   username: 'Alice',   avatarUrl: null } },
      { userId: 'bob',     User: { id: 'bob',     username: 'Bob',     avatarUrl: null } },
      { userId: 'charlie', User: { id: 'charlie', username: 'Charlie', avatarUrl: null } },
    ]);
    (Expense.findAll as jest.Mock).mockResolvedValue([
      {
        id:            'e-1',
        amount:        12000,   // 120 €
        payerId:       'alice',
        payerSnapshot: 'Alice',
        shares: [
          { userId: 'alice',   userSnapshot: 'Alice',   amount: 4000 },
          { userId: 'bob',     userSnapshot: 'Bob',     amount: 4000 },
          { userId: 'charlie', userSnapshot: 'Charlie', amount: 4000 },
        ],
      },
    ]);

    const r = buildRes();
    await getBalances(buildReq({ colocationId: 'coloc-1' }), r, buildNext());

    const body  = r.json.mock.calls[0][0];
    const total = body.debts.reduce((acc: number, d: any) => acc + d.amount, 0);

    // L'algo glouton doit tout résoudre en 2 dettes (pas 3)
    expect(body.debts).toHaveLength(2);
    // La somme des dettes doit être égale au total dû
    expect(total).toBe(8000);
    // Tous les créditeurs dans les dettes doivent être Alice
    body.debts.forEach((d: any) => expect(d.toUserId).toBe('alice'));
  });
});