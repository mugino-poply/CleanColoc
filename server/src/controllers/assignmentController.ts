import type { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import TaskAssignment from '../models/TaskAssignment';
import Membership from '../models/Membership';
import Task from '../models/Task';

const ASSIGNMENT_PUBLIC_ATTRIBUTES = [
  'id',
  'taskId',
  'userId',
  'colocationId',
  'periodStart',
  'periodEnd',
  'status',
  'completedAt',
  'taskTitleSnapshot',
  'taskWeightSnapshot',
  'generationMethod',
  'transferredFromUserId',
  'createdAt',
  'updatedAt',
] as const;

/**
 * US-15 / US-16 — GET /api/colocations/:id/assignments
 * Liste les TaskAssignments d'une colocation.
 * Filtres optionnels : status, userId, period.
 */
export const getColocationAssignments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const colocationId = (req as any).colocationId as string;
    const now = new Date();

    const where: Record<string, unknown> = { colocationId };

    // Filtre status
    const statusFilter = req.query['status'] as string | undefined;
    if (statusFilter) {
      if (!['à faire', 'terminée', 'manquée'].includes(statusFilter)) {
        res.status(400).json({
          message: "Le filtre status doit valoir 'à faire', 'terminée' ou 'manquée'.",
        });
        return;
      }
      where['status'] = statusFilter;
    }

    // Filtre userId
    const userIdFilter = req.query['userId'] as string | undefined;
    if (userIdFilter) {
      const resolvedUserId =
        userIdFilter === 'me' ? (req as any).user.id : userIdFilter;

      if (userIdFilter !== 'me') {
        const membership = await Membership.findOne({
          where: { userId: resolvedUserId, colocationId },
          attributes: ['id'],
        });
        if (!membership) {
          res.status(400).json({
            message: "L'utilisateur ciblé n'est pas membre de cette colocation.",
          });
          return;
        }
      }

      where['userId'] = resolvedUserId;
    }

    // Filtre period (défaut : current)
    const period = (req.query['period'] as string) ?? 'current';
    if (!['current', 'next', 'past', 'all'].includes(period)) {
      res.status(400).json({
        message: "Le filtre period doit valoir 'current', 'next', 'past' ou 'all'.",
      });
      return;
    }

    if (period === 'current') {
      where['periodStart'] = { [Op.lte]: now };
      where['periodEnd'] = { [Op.gte]: now };
    } else if (period === 'next') {
      where['periodStart'] = { [Op.gt]: now };
    } else if (period === 'past') {
      where['periodEnd'] = { [Op.lt]: now };
    }
    // 'all' : pas de filtre sur les dates

    const assignments = await TaskAssignment.findAll({
        where,
        attributes: [...ASSIGNMENT_PUBLIC_ATTRIBUTES],
        include: [
            {
            model: Task,
            as: 'task',
            attributes: ['description', 'dueDate', 'isRecurring', 'recurringInterval', 'weight'],
            },
        ],
        order: [
            ['status', 'ASC'],
            ['periodEnd', 'ASC'],
        ],
        });

    res.status(200).json(assignments);
  } catch (error) {
    next(error);
  }
};

/**
 * US-13 — PATCH /api/assignments/:id/assign
 * Assigne (ou désassigne avec null) une TaskAssignment à un membre.
 */
export const assignTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignment = (req as any).assignment as TaskAssignment;

    if (['terminée', 'manquée'].includes(assignment.status)) {
      res.status(400).json({
        message: "Impossible de réassigner une tâche déjà terminée ou manquée.",
      });
      return;
    }

    const { userId } = req.body;

    if (userId === undefined) {
      res.status(400).json({ message: 'Le champ userId est obligatoire (UUID ou null).' });
      return;
    }

    const previousUserId = assignment.userId;

    if (userId === null) {
      res.status(400).json({
        message: "La désassignation n'est pas permise : userId ne peut pas être null (colonne NOT NULL).",
      });
      return;
    }

    if (typeof userId !== 'string') {
      res.status(400).json({ message: 'Le champ userId doit être un UUID.' });
      return;
    }

    const targetMembership = await Membership.findOne({
      where: { userId, colocationId: assignment.colocationId },
      attributes: ['id'],
    });
    if (!targetMembership) {
      res.status(400).json({
        message: "L'utilisateur ciblé n'est pas membre de cette colocation.",
      });
      return;
    }

    await assignment.update({
      userId,
      transferredFromUserId: previousUserId,
      generationMethod: 'manual',
    });

    const refreshed = await TaskAssignment.findByPk(assignment.id, {
      attributes: [...ASSIGNMENT_PUBLIC_ATTRIBUTES],
    });
    res.status(200).json(refreshed);
  } catch (error) {
    next(error);
  }
};

/**
 * US-14 — PATCH /api/assignments/:id/complete
 * Toggle 'à faire' ↔ 'terminée'. Une assignation 'manquée' peut aussi être complétée.
 * Race condition gérée par UPDATE conditionnel sur le statut courant.
 */
export const completeTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignment = (req as any).assignment as TaskAssignment;
    const userId = (req as any).user.id as string;

    if (assignment.status === 'à faire' || assignment.status === 'manquée') {
      const [affected] = await TaskAssignment.update(
        { status: 'terminée', completedAt: new Date() },
        {
          where: {
            id: assignment.id,
            status: ['à faire', 'manquée'],
          },
        }
      );
      if (affected === 0) {
        res.status(409).json({
          message: 'La tâche a déjà été modifiée par un autre membre.',
        });
        return;
      }
    } else {
      // Réouverture — uniquement depuis 'terminée'
      const [affected] = await TaskAssignment.update(
        { status: 'à faire', completedAt: undefined },
        { where: { id: assignment.id, status: 'terminée' } }
      );
      if (affected === 0) {
        res.status(409).json({
          message: 'La tâche a déjà été rouverte par un autre membre.',
        });
        return;
      }
    }

    const refreshed = await TaskAssignment.findByPk(assignment.id, {
      attributes: [...ASSIGNMENT_PUBLIC_ATTRIBUTES],
    });
    res.status(200).json(refreshed);
  } catch (error) {
    next(error);
  }
};

/**
 * US-17 — DELETE /api/assignments/:id
 * Soft delete d'une assignation spécifique.
 * Refusé si status != 'à faire'.
 */
export const deleteAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignment = (req as any).assignment as TaskAssignment;

    if (assignment.status !== 'à faire') {
      res.status(400).json({
        message: "Seule une assignation 'à faire' peut être annulée.",
      });
      return;
    }

    await assignment.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};