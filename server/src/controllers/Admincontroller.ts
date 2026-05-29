import type { Request, Response, NextFunction } from 'express';
import User from '../models/user';
import Colocation from '../models/Colocation';
import Membership from '../models/Membership';
import Task from '../models/Task';
import TaskAssignment from '../models/TaskAssignment';
import { Op } from 'sequelize';

// ── GET /api/admin/stats ───────────────────────────────────────────────────────
export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [totalUsers, totalColocations, totalTasks, totalAssignments] = await Promise.all([
      User.count({ where: { deletedAt: { [Op.is]: null } as any } }),
      Colocation.count({ where: { deletedAt: { [Op.is]: null } as any } }),
      Task.count({ where: { deletedAt: { [Op.is]: null } as any } }),
      TaskAssignment.count({ where: { deletedAt: { [Op.is]: null } as any } }),
    ]);

    const recentUsers = await User.findAll({
      where: { deletedAt: { [Op.is]: null } as any },
      order: [['createdAt', 'DESC']],
      limit: 6,
      attributes: ['id', 'username', 'email', 'createdAt'],
    });

    res.status(200).json({ totalUsers, totalColocations, totalTasks, totalAssignments, recentUsers });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/admin/users ───────────────────────────────────────────────────────
export const listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const search = req.query['search'] as string | undefined;
    const page   = parseInt(req.query['page'] as string ?? '1', 10);
    const limit  = parseInt(req.query['limit'] as string ?? '30', 10);
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: { [Op.is]: null } as any };
    if (search) {
      where[Op.or as unknown as string] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email:    { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      attributes: ['id', 'username', 'email', 'avatarUrl', 'createdAt'],
    });

    res.status(200).json({ users: rows, total: count, page, totalPages: Math.ceil(count / limit) });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/admin/users/:id ────────────────────────────────────────────────
export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ message: 'Utilisateur introuvable.' });
      return;
    }
    await user.update({ deletedAt: new Date() }); // soft delete cohérent avec votre schema
    res.status(200).json({ message: 'Utilisateur supprimé.' });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/admin/colocations ─────────────────────────────────────────────────
export const listColocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const colocations = await Colocation.findAll({
      where: { deletedAt: { [Op.is]: null } as any },
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'name', 'description', 'inviteCode', 'autoRotation', 'createdAt'],
    });

    // Enrichit chaque colocation avec le nombre de membres et de tâches
    const enriched = await Promise.all(
      colocations.map(async (c) => {
        const [memberCount, taskCount] = await Promise.all([
          Membership.count({ where: { colocationId: c.id, deletedAt: { [Op.is]: null } as any } }),
          Task.count({      where: { colocationId: c.id, deletedAt: { [Op.is]: null } as any } }),
        ]);
        return { ...c.toJSON(), memberCount, taskCount };
      })
    );

    res.status(200).json(enriched);
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/admin/colocations/:id ─────────────────────────────────────────
export const deleteColocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const colocation = await Colocation.findByPk(id);
    if (!colocation) {
      res.status(404).json({ message: 'Colocation introuvable.' });
      return;
    }
    await colocation.update({ deletedAt: new Date() });
    res.status(200).json({ message: 'Colocation supprimée.' });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/admin/tasks ───────────────────────────────────────────────────────
export const listTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tasks = await Task.findAll({
      where: { deletedAt: { [Op.is]: null } as any },
      order: [['createdAt', 'DESC']],
      limit: 100,
      attributes: ['id', 'title', 'isRecurring', 'recurringInterval', 'weight', 'createdAt', 'colocationId'],
      include: [{
        model: Colocation,
        as: 'colocation',
        attributes: ['name'],
      }],
    });

    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

// ── GET /api/admin/assignments ─────────────────────────────────────────────────
export const listAssignments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const assignments = await TaskAssignment.findAll({
      where: { deletedAt: { [Op.is]: null } as any },
      order: [['createdAt', 'DESC']],
      limit: 100,
      attributes: ['id', 'taskTitleSnapshot', 'status', 'periodStart', 'periodEnd', 'completedAt', 'generationMethod'],
      include: [
        { model: User,       as: 'user',       attributes: ['username'] },
        { model: Colocation, as: 'colocation', attributes: ['name']     },
      ],
    });

    res.status(200).json(assignments);
  } catch (error) {
    next(error);
  }
};