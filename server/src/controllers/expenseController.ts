import type { Request, Response, NextFunction } from 'express';
import Expense from '../models/Expense';
import ExpenseShare from '../models/ExpenseShare';
import Membership from '../models/Membership';
import User from '../models/user';

/**
 * US-19 — POST /api/colocations/:id/expenses
 *
 * Crée une dépense partagée et calcule les parts à parts égales.
 * Le payeur est automatiquement l'utilisateur connecté.
 * Si memberIds est omis, tous les membres actifs de la colocation sont inclus.
 *
 * Règle de répartition : Math.floor(amount / n) par membre.
 * Le reste (amount % n centimes) est ajouté à la première part de la liste.
 * En pratique, l'écart est au maximum de (n-1) centimes.
 */
export const createExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const colocationId = (req as any).colocationId as string;
    const payerId = (req as any).user.id as string;

    const { title, amount, category, description, date, memberIds } = req.body;

    // --- Validations ---

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ message: 'Le champ title est obligatoire.' });
      return;
    }

    if (amount === undefined || amount === null) {
      res.status(400).json({ message: 'Le champ amount est obligatoire (entier en centimes, > 0).' });
      return;
    }

    const amountInt = Number(amount);
    if (!Number.isInteger(amountInt) || amountInt <= 0) {
      res.status(400).json({
        message: 'Le montant doit être un entier positif en centimes (ex: 4250 pour 42,50 €).',
      });
      return;
    }

    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      res.status(400).json({ message: 'Le champ category est obligatoire.' });
      return;
    }

    // Date : défaut à aujourd'hui si absente
    let expenseDate: string;
    if (date !== undefined && date !== null && date !== '') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({ message: 'Le champ date doit être au format YYYY-MM-DD.' });
        return;
      }
      expenseDate = date as string;
    } else {
      expenseDate = new Date().toISOString().split('T')[0]!;
    }

    // --- Résolution des membres concernés ---

    let resolvedMemberIds: string[];

    if (memberIds !== undefined) {
      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        res.status(400).json({ message: 'memberIds doit être un tableau non vide de UUIDs.' });
        return;
      }

      // Vérifier que tous les IDs fournis sont bien membres actifs de la colocation
      const memberships = await Membership.findAll({
        where: { colocationId, userId: memberIds },
        attributes: ['userId'],
      });

      if (memberships.length !== memberIds.length) {
        res.status(400).json({
          message: 'Certains memberIds fournis ne sont pas membres actifs de cette colocation.',
        });
        return;
      }

      resolvedMemberIds = memberIds as string[];
    } else {
      // Par défaut : tous les membres actifs de la colocation
      const memberships = await Membership.findAll({
        where: { colocationId },
        attributes: ['userId'],
      });
      resolvedMemberIds = memberships.map((m) => m.userId);
    }

    if (resolvedMemberIds.length === 0) {
      res.status(400).json({ message: 'La dépense doit concerner au moins un membre.' });
      return;
    }

    // --- Snapshots ---

    const payer = await User.findByPk(payerId, { attributes: ['id', 'username'] });
    if (!payer) {
      res.status(404).json({ message: 'Utilisateur payeur introuvable.' });
      return;
    }

    const concernedUsers = await User.findAll({
      where: { id: resolvedMemberIds },
      attributes: ['id', 'username'],
    });
    const userMap = new Map<string, string>(
      concernedUsers.map((u) => [u.id, u.username])
    );

    // --- Calcul des parts ---

    const n = resolvedMemberIds.length;
    const shareAmount = Math.floor(amountInt / n);
    const remainder = amountInt - shareAmount * n;
    // Le reste (0 à n-1 centimes) est ajouté à la première part de la liste

    // --- Persistance ---

    const expense = await Expense.create({
      title: title.trim(),
      amount: amountInt,
      category: category.trim(),
      description: description ?? null,
      date: expenseDate,
      payerId,
      payerSnapshot: payer.username,
      colocationId,
    });

    const sharesData = resolvedMemberIds.map((userId, index) => ({
      expenseId: expense.id,
      userId,
      userSnapshot: userMap.get(userId) ?? 'Membre inconnu',
      amount: index === 0 ? shareAmount + remainder : shareAmount,
    }));

    const shares = await ExpenseShare.bulkCreate(sharesData);

    res.status(201).json({ expense, shares });
  } catch (error) {
    next(error);
  }
};

/**
 * US-20 — GET /api/expenses/:id
 *
 * Retourne le détail complet d'une dépense :
 * titre, montant, catégorie, date, description, payeur, parts par membre.
 *
 * L'accès est garanti par requireColocationMember (req.expense déjà chargé).
 * On refetch avec includes pour obtenir les relations complètes.
 */
export const getExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expense = (req as any).expense as InstanceType<typeof Expense>;

    const full = await Expense.findByPk(expense.id, {
      attributes: [
        'id',
        'title',
        'amount',
        'category',
        'description',
        'date',
        'payerId',
        'payerSnapshot',
        'colocationId',
        'createdAt',
      ],
      include: [
        {
          model: ExpenseShare,
          as: 'shares',
          attributes: ['id', 'userId', 'userSnapshot', 'amount'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'avatarUrl'],
            },
          ],
        },
      ],
    });

    if (!full) {
      res.status(404).json({ message: 'Dépense introuvable.' });
      return;
    }

    res.status(200).json(full);
  } catch (error) {
    next(error);
  }
};


/**
 * GET /api/colocations/:id/expenses
 *
 * Retourne toutes les dépenses actives de la colocation,
 * triées par date décroissante (la plus récente en premier).
 * Chaque dépense embarque ses parts (shares) avec snapshot utilisateur.
 */
export const getExpenses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const colocationId = (req as any).colocationId as string;

    const expenses = await Expense.findAll({
      where: { colocationId },
      attributes: [
        'id',
        'title',
        'amount',
        'category',
        'description',
        'date',
        'payerId',
        'payerSnapshot',
        'createdAt',
      ],
      include: [
        {
          model: ExpenseShare,
          as: 'shares',
          attributes: ['id', 'userId', 'userSnapshot', 'amount'],
        },
      ],
      order: [['date', 'DESC']],
    });

    res.status(200).json(expenses);
  } catch (error) {
    next(error);
  }
};


/**
 * US-21 — GET /api/colocations/:id/balances
 *
 * Calcule les soldes nets de chaque membre et simplifie les dettes.
 *
 * net(membre) = total payé − total des parts
 * Positif → on lui doit. Négatif → il doit.
 *
 * Les dépenses avec payerId null (membre retiré) sont exclues du crédit.
 * Les parts avec userId null sont exclues du débit.
 */
export const getBalances = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const colocationId = (req as any).colocationId as string;

    // Récupère tous les membres actifs de la coloc pour les snapshots
    const memberships = await Membership.findAll({
      where: { colocationId },
      attributes: ['userId'],
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'avatarUrl'],
        },
      ],
    });

    const memberIds = memberships.map((m) => m.userId);

    if (memberIds.length === 0) {
      res.status(200).json({ balances: [], debts: [] });
      return;
    }

    // Récupère toutes les dépenses actives avec leurs parts
    const expenses = await Expense.findAll({
      where: { colocationId },
      attributes: ['id', 'amount', 'payerId', 'payerSnapshot'],
      include: [
        {
          model: ExpenseShare,
          as: 'shares',
          attributes: ['userId', 'userSnapshot', 'amount'],
        },
      ],
    });

    // Passe 1 : calcul du bilan net par membre (en centimes)
    const nets = new Map<string, number>(memberIds.map((id) => [id, 0]));

    for (const expense of expenses) {
      // Crédit : le payeur a avancé le montant total
      if (expense.payerId && nets.has(expense.payerId)) {
        nets.set(expense.payerId, nets.get(expense.payerId)! + expense.amount);
      }

      // Débit : chaque membre concerné doit sa part
      const shares = (expense as any).shares as Array<{
        userId: string | null;
        userSnapshot: string;
        amount: number;
      }>;

      for (const share of shares) {
        if (share.userId && nets.has(share.userId)) {
          nets.set(share.userId, nets.get(share.userId)! - share.amount);
        }
      }
    }

    // Construction de la réponse balances avec snapshots
    const userInfoMap = new Map<string, { username: string; avatarUrl: string | null }>();
    for (const m of memberships) {
      const user = (m as any).User as { id: string; username: string; avatarUrl: string | null } | undefined;
      if (user) {
        userInfoMap.set(m.userId, { username: user.username, avatarUrl: user.avatarUrl ?? null });
      }
    }

    const balances = memberIds.map((userId) => ({
      userId,
      username: userInfoMap.get(userId)?.username ?? 'Inconnu',
      avatarUrl: userInfoMap.get(userId)?.avatarUrl ?? null,
      net: nets.get(userId) ?? 0,
    }));

    // Passe 2 : simplification des dettes (algo glouton)
    const creditors = balances
      .filter((b) => b.net > 0)
      .map((b) => ({ ...b }))
      .sort((a, b) => b.net - a.net);

    const debtors = balances
      .filter((b) => b.net < 0)
      .map((b) => ({ ...b }))
      .sort((a, b) => a.net - b.net);

    const debts: Array<{
      fromUserId: string;
      fromUsername: string;
      toUserId: string;
      toUsername: string;
      amount: number;
    }> = [];

    let ci = 0;
    let di = 0;

    while (ci < creditors.length && di < debtors.length) {
      const creditor = creditors[ci]!;
      const debtor = debtors[di]!;

      const amount = Math.min(creditor.net, -debtor.net);

      debts.push({
        fromUserId: debtor.userId,
        fromUsername: debtor.username,
        toUserId: creditor.userId,
        toUsername: creditor.username,
        amount,
      });

      creditor.net -= amount;
      debtor.net += amount;

      if (creditor.net === 0) ci++;
      if (debtor.net === 0) di++;
    }

    res.status(200).json({ balances, debts });
  } catch (error) {
    next(error);
  }
};