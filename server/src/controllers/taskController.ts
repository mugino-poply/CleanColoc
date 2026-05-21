import type { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import Task from '../models/Task';
import Membership from '../models/Membership';

const TASK_PUBLIC_ATTRIBUTES = [
  'id',
  'title',
  'description',
  'status',
  'assignedTo',
  'colocationId',
  'isRecurring',
  'recurringInterval',
  'dueDate',
  'completedAt',
  'completedBy',
  'createdAt',
  'updatedAt',
] as const;

/**
 * US-15 / US-16 — GET /api/colocations/:id/tasks
 * Liste les tâches d'une colocation, avec filtres optionnels status et assignedTo.
 * Tri par défaut : 'à faire' avant 'terminée', puis dueDate croissante (nulls last).
 */
export const getColocationTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const colocationId = (req as any).colocationId as string;

    const where: Record<string, unknown> = { colocationId };

    // US-16 — filtre par statut
    const statusFilter = req.query['status'] as string | undefined;
    if (statusFilter) {
      if (statusFilter !== 'à faire' && statusFilter !== 'terminée') {
        res.status(400).json({
          message: "Le filtre status doit valoir 'à faire' ou 'terminée'.",
        });
        return;
      }
      where['status'] = statusFilter;
    }

    // US-16 — filtre par membre assigné
    const assignedToFilter = req.query['assignedTo'] as string | undefined;
    if (assignedToFilter) {
      where['assignedTo'] = assignedToFilter;
    }

    const tasks = await Task.findAll({
      where,
      attributes: [...TASK_PUBLIC_ATTRIBUTES],
      order: [
        ['status', 'ASC'],   // 'à faire' < 'terminée' alphabétiquement
        ['dueDate', 'ASC'],
      ],
    });

    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

/**
 * US-12 — POST /api/colocations/:id/tasks
 * Crée une tâche dans la colocation. Statut 'à faire' par défaut.
 */
export const createTaskInColocation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const colocationId = (req as any).colocationId as string;
    const { title, description, dueDate } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ message: 'Le champ title est obligatoire.' });
      return;
    }

    // dueDate optionnelle, mais si fournie elle doit être dans le futur
    let parsedDueDate: Date | undefined;
    if (dueDate !== undefined && dueDate !== null && dueDate !== '') {
      parsedDueDate = new Date(dueDate);
      if (Number.isNaN(parsedDueDate.getTime())) {
        res.status(400).json({ message: "Le champ dueDate n'est pas une date valide." });
        return;
      }
      if (parsedDueDate.getTime() <= Date.now()) {
        res.status(400).json({ message: 'La date d\'échéance doit être dans le futur.' });
        return;
      }
    }

    const task = await Task.create({
      title: title.trim(),
      description: description ?? undefined,
      colocationId,
      dueDate: parsedDueDate,
      isRecurring: false,
      status: 'à faire',
    });

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

/**
 * US-17 (modification) — PATCH /api/tasks/:id
 * Modifie title, description, dueDate. Aucun autre champ n'est modifiable ici.
 */
export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Task posée par requireColocationMember
    const task = (req as any).task as Task;

    const { title, description, dueDate } = req.body;
    // Typage volontairement permissif : null est nécessaire pour effacer
    // description/dueDate en base, mais le type du modèle ne le déclare pas.
    const updates: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({ message: 'Le champ title ne peut pas être vide.' });
        return;
      }
      updates['title'] = title.trim();
    }

    if (description !== undefined) {
      updates['description'] = description === null ? null : String(description);
    }

    if (dueDate !== undefined) {
      if (dueDate === null || dueDate === '') {
        updates['dueDate'] = null;
      } else {
        const parsed = new Date(dueDate);
        if (Number.isNaN(parsed.getTime())) {
          res.status(400).json({ message: "Le champ dueDate n'est pas une date valide." });
          return;
        }
        updates['dueDate'] = parsed;
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ message: 'Aucun champ valide à modifier.' });
      return;
    }

    await task.update(updates as any);
    const refreshed = await Task.findByPk(task.id, {
      attributes: [...TASK_PUBLIC_ATTRIBUTES],
    });
    res.status(200).json(refreshed);
  } catch (error) {
    next(error);
  }
};

/**
 * US-13 — PATCH /api/tasks/:id/assign
 * Assigne (ou désassigne avec null) une tâche à un membre de la même colocation.
 */
export const assignTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = (req as any).task as Task;
    const { assignedTo } = req.body;

    if (assignedTo === undefined) {
      res.status(400).json({ message: 'Le champ assignedTo est obligatoire (UUID ou null).' });
      return;
    }

    // Désassignation
    if (assignedTo === null) {
      await task.update({ assignedTo: undefined });
      const refreshed = await Task.findByPk(task.id, {
        attributes: [...TASK_PUBLIC_ATTRIBUTES],
      });
      res.status(200).json(refreshed);
      return;
    }

    if (typeof assignedTo !== 'string') {
      res.status(400).json({ message: 'Le champ assignedTo doit être un UUID ou null.' });
      return;
    }

    // L'assigné doit être membre de la même colocation que la tâche
    const targetMembership = await Membership.findOne({
      where: { userId: assignedTo, colocationId: task.colocationId },
      attributes: ['id'],
    });
    if (!targetMembership) {
      res.status(400).json({
        message: "L'utilisateur ciblé n'est pas membre de cette colocation.",
      });
      return;
    }

    await task.update({ assignedTo });
    const refreshed = await Task.findByPk(task.id, {
      attributes: [...TASK_PUBLIC_ATTRIBUTES],
    });
    res.status(200).json(refreshed);
  } catch (error) {
    next(error);
  }
};

/**
 * US-14 — PATCH /api/tasks/:id/complete
 * Marque la tâche comme 'terminée' (ou la rouvre en 'à faire' si déjà terminée).
 * Toggle : enregistre / efface completedAt et completedBy en conséquence.
 * Race condition gérée par UPDATE conditionnel sur le statut courant.
 */
export const completeTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = (req as any).task as Task;
    const userId = (req as any).user.id as string;

    if (task.status === 'à faire') {
      // Passage à 'terminée' — atomique : on n'écrit que si le statut est encore 'à faire'
      const [affected] = await Task.update(
        {
          status: 'terminée',
          completedAt: new Date(),
          completedBy: userId,
        },
        { where: { id: task.id, status: 'à faire' } }
      );
      if (affected === 0) {
        res.status(409).json({
          message: 'La tâche a déjà été marquée comme terminée par un autre membre.',
        });
        return;
      }
    } else {
      // Réouverture — on efface completedAt et completedBy
      const [affected] = await Task.update(
        {
          status: 'à faire',
          completedAt: undefined,
          completedBy: undefined,
        },
        { where: { id: task.id, status: 'terminée' } }
      );
      if (affected === 0) {
        res.status(409).json({
          message: 'La tâche a déjà été rouverte par un autre membre.',
        });
        return;
      }
    }

    const refreshed = await Task.findByPk(task.id, {
      attributes: [...TASK_PUBLIC_ATTRIBUTES],
    });
    res.status(200).json(refreshed);
  } catch (error) {
    next(error);
  }
};

/**
 * US-17 (suppression) — DELETE /api/tasks/:id
 * Soft delete (paranoid: true). La ligne reste en base avec deletedAt renseigné.
 */
export const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = (req as any).task as Task;
    await task.destroy(); // soft delete grâce à paranoid: true
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};