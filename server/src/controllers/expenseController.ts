import type { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
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
 * Retourne le détail complet d'une dépense.
 * L'accès est garanti par requireColocationMember (req.expense déjà chargé).
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
        'id', 'title', 'amount', 'category', 'description',
        'date', 'payerId', 'payerSnapshot', 'colocationId', 'createdAt',
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
 * GET /api/colocations/:id/expenses (US-22)
 *
 * Retourne les dépenses actives de la colocation, triées par date décroissante.
 * Filtres optionnels via query params :
 *   - from  : YYYY-MM-DD — inclut les dépenses à partir de cette date
 *   - to    : YYYY-MM-DD — inclut les dépenses jusqu'à cette date
 *   - category : filtre exact sur la catégorie
 */
export const getExpenses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const colocationId = (req as any).colocationId as string;
    const { from, to, category } = req.query;

    const where: any = { colocationId };

    // Filtre de période
    if (from !== undefined || to !== undefined) {
      const dateFilter: any = {};

      if (from !== undefined && from !== '') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(from as string)) {
          res.status(400).json({ message: 'Le paramètre from doit être au format YYYY-MM-DD.' });
          return;
        }
        dateFilter[Op.gte] = from as string;
      }

      if (to !== undefined && to !== '') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(to as string)) {
          res.status(400).json({ message: 'Le paramètre to doit être au format YYYY-MM-DD.' });
          return;
        }
        dateFilter[Op.lte] = to as string;
      }

      if (Object.keys(dateFilter).length > 0) {
        where['date'] = dateFilter;
      }
    }

    // Filtre catégorie
    if (category && typeof category === 'string' && category.trim() !== '') {
      where['category'] = category.trim();
    }

    const expenses = await Expense.findAll({
      where,
      attributes: [
        'id', 'title', 'amount', 'category', 'description',
        'date', 'payerId', 'payerSnapshot', 'createdAt',
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
 * US-23 — PATCH /api/expenses/:id
 *
 * Modifie une dépense existante. Seul le payeur ou un admin peut agir.
 * Champs modifiables : title, amount, category, description, date, memberIds.
 *
 * Les shares sont recréées (soft delete + bulkCreate) dès que amount OU memberIds change.
 * Si memberIds est absent, les membres existants sont conservés.
 * Si amount est absent mais memberIds change, le montant actuel est redistribué.
 */
export const updateExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expense = (req as any).expense as InstanceType<typeof Expense>;
    const userId = (req as any).user.id as string;
    const role = (req as any).role as string;

    // Contrôle d'accès : payeur OU admin de la colocation
    if (expense.payerId !== userId && role !== 'admin') {
      res.status(403).json({
        message: 'Seul le payeur ou un admin peut modifier cette dépense.',
      });
      return;
    }

    const { title, amount, category, description, date, memberIds } = req.body;

    // Au moins un champ doit être fourni
    if (
      title === undefined &&
      amount === undefined &&
      category === undefined &&
      description === undefined &&
      date === undefined &&
      memberIds === undefined
    ) {
      res.status(400).json({ message: 'Aucun champ à mettre à jour.' });
      return;
    }

    // --- Validations scalaires ---

    if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
      res.status(400).json({ message: 'Le champ title ne peut pas être vide.' });
      return;
    }

    let amountInt: number | undefined;
    if (amount !== undefined) {
      amountInt = Number(amount);
      if (!Number.isInteger(amountInt) || amountInt <= 0) {
        res.status(400).json({
          message: 'Le montant doit être un entier positif en centimes (ex: 4250 pour 42,50 €).',
        });
        return;
      }
    }

    if (category !== undefined && (typeof category !== 'string' || category.trim().length === 0)) {
      res.status(400).json({ message: 'Le champ category ne peut pas être vide.' });
      return;
    }

    if (date !== undefined && date !== null && date !== '') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({ message: 'Le champ date doit être au format YYYY-MM-DD.' });
        return;
      }
    }

    // --- Validation memberIds (avant transaction) ---

    let newMemberIds: string[] | undefined;

    if (memberIds !== undefined) {
      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        res.status(400).json({ message: 'memberIds doit être un tableau non vide de UUIDs.' });
        return;
      }

      const memberships = await Membership.findAll({
        where: { colocationId: (expense as any).colocationId, userId: memberIds },
        attributes: ['userId'],
      });

      if (memberships.length !== memberIds.length) {
        res.status(400).json({
          message: 'Certains memberIds fournis ne sont pas membres actifs de cette colocation.',
        });
        return;
      }

      newMemberIds = memberIds as string[];
    }

    // Les shares doivent être recréées si le montant ou les membres changent
    const shouldRecreateShares = amountInt !== undefined || newMemberIds !== undefined;

    // --- Transaction ---

    const t = await Expense.sequelize!.transaction();
    try {
      if (shouldRecreateShares) {
        const finalAmount = amountInt ?? (expense as any).amount;

        let finalMemberIds: string[];
        let snapshotMap: Map<string, string>;

        if (newMemberIds !== undefined) {
          // Nouveaux membres : fetch les snapshots depuis User
          finalMemberIds = newMemberIds;
          const users = await User.findAll({
            where: { id: finalMemberIds },
            attributes: ['id', 'username'],
          });
          snapshotMap = new Map(users.map((u) => [u.id, u.username]));
        } else {
          // Membres inchangés : lire les shares actives dans la transaction
          const existingShares = await ExpenseShare.findAll({
            where: { expenseId: expense.id },
            attributes: ['userId', 'userSnapshot'],
            transaction: t,
          });

          finalMemberIds = existingShares
            .map((s) => (s as any).userId as string | null)
            .filter((id): id is string => id !== null);

          snapshotMap = new Map(
            existingShares
              .filter((s) => (s as any).userId !== null)
              .map((s) => [(s as any).userId as string, (s as any).userSnapshot as string])
          );
        }

        if (finalMemberIds.length === 0) {
          await t.rollback();
          res.status(400).json({ message: 'La dépense doit concerner au moins un membre.' });
          return;
        }

        // Soft delete des shares existantes
        await ExpenseShare.destroy({ where: { expenseId: expense.id }, transaction: t });

        // Recréation avec le nouveau montant et les nouveaux membres
        const n = finalMemberIds.length;
        const shareAmount = Math.floor(finalAmount / n);
        const remainder = finalAmount - shareAmount * n;

        const sharesData = finalMemberIds.map((uid, index) => ({
          expenseId: expense.id,
          userId: uid,
          userSnapshot: snapshotMap.get(uid) ?? 'Membre inconnu',
          amount: index === 0 ? shareAmount + remainder : shareAmount,
        }));

        await ExpenseShare.bulkCreate(sharesData, { transaction: t });

        // Mettre à jour le montant sur l'expense si changé
        if (amountInt !== undefined) {
          (expense as any).amount = amountInt;
        }
      }

      // Mise à jour des champs scalaires
      if (title !== undefined) (expense as any).title = title.trim();
      if (category !== undefined) (expense as any).category = category.trim();
      if (description !== undefined) (expense as any).description = description ?? null;
      if (date !== undefined && date !== null && date !== '') (expense as any).date = date;

      await expense.save({ transaction: t });
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    // Refetch complet
    const updated = await Expense.findByPk(expense.id, {
      attributes: [
        'id', 'title', 'amount', 'category', 'description',
        'date', 'payerId', 'payerSnapshot', 'colocationId', 'createdAt',
      ],
      include: [
        {
          model: ExpenseShare,
          as: 'shares',
          attributes: ['id', 'userId', 'userSnapshot', 'amount'],
          include: [
            { model: User, as: 'user', attributes: ['id', 'username', 'avatarUrl'] },
          ],
        },
      ],
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * US-23 — DELETE /api/expenses/:id
 *
 * Supprime (soft delete) une dépense et ses parts.
 * Seul le payeur ou un admin de la colocation peut agir.
 * Les deux destructions sont atomiques (transaction).
 */
export const deleteExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expense = (req as any).expense as InstanceType<typeof Expense>;
    const userId = (req as any).user.id as string;
    const role = (req as any).role as string;

    if (expense.payerId !== userId && role !== 'admin') {
      res.status(403).json({
        message: 'Seul le payeur ou un admin peut supprimer cette dépense.',
      });
      return;
    }

    const t = await Expense.sequelize!.transaction();
    try {
      // Soft delete des parts d'abord (paranoid: true → deletedAt)
      await ExpenseShare.destroy({ where: { expenseId: expense.id }, transaction: t });
      // Soft delete de la dépense elle-même
      await expense.destroy({ transaction: t });
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    res.status(204).send();
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
 */
export const getBalances = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const colocationId = (req as any).colocationId as string;

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

    // Passe 1 : bilan net par membre (en centimes)
    const nets = new Map<string, number>(memberIds.map((id) => [id, 0]));

    for (const expense of expenses) {
      if (expense.payerId && nets.has(expense.payerId)) {
        nets.set(expense.payerId, nets.get(expense.payerId)! + expense.amount);
      }

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