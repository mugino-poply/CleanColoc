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