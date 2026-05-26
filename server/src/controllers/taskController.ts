import type { Request, Response, NextFunction } from 'express';
import Task from '../models/Task';
import TaskAssignment from '../models/TaskAssignment';

const TASK_PUBLIC_ATTRIBUTES = [
  'id',
  'title',
  'description',
  'colocationId',
  'isRecurring',
  'recurringInterval',
  'dueDate',
  'weight',
  'createdAt',
  'updatedAt',
] as const;

/**
 * US-12 — POST /api/colocations/:id/tasks
 * Crée un template de tâche.
 * Pour une tâche ponctuelle, crée également une TaskAssignment immédiatement.
 * Pour une tâche récurrente, seul le template est créé (le scheduler s'occupe des assignations).
 */
export const createTaskInColocation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const colocationId = (req as any).colocationId as string;
    const { title, description, isRecurring, recurringInterval, dueDate } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ message: 'Le champ title est obligatoire.' });
      return;
    }

    const recurring = isRecurring === true || isRecurring === 'true';

    const validIntervals = ['daily', 'weekly', 'biweekly', 'monthly'];
    if (recurring && !validIntervals.includes(recurringInterval)) {
      res.status(400).json({
        message: "Le champ recurringInterval est obligatoire pour une tâche récurrente (daily | weekly | biweekly | monthly).",
      });
      return;
    }

    if (!recurring && recurringInterval) {
      res.status(400).json({
        message: "Le champ recurringInterval ne doit pas être fourni pour une tâche ponctuelle.",
      });
      return;
    }

    let parsedDueDate: Date | undefined;
    if (dueDate !== undefined && dueDate !== null && dueDate !== '') {
      parsedDueDate = new Date(dueDate);
      if (Number.isNaN(parsedDueDate.getTime())) {
        res.status(400).json({ message: "Le champ dueDate n'est pas une date valide." });
        return;
      }
      if (parsedDueDate.getTime() <= Date.now()) {
        res.status(400).json({ message: "La date d'échéance doit être dans le futur." });
        return;
      }
    }

    const task = await Task.create({
      title: title.trim(),
      description: description ?? undefined,
      colocationId,
      isRecurring: recurring,
      recurringInterval: recurring ? recurringInterval : undefined,
      dueDate: parsedDueDate,
    });

    // Pour une tâche ponctuelle, on crée immédiatement une TaskAssignment sans assigné
    if (!recurring) {
      const now = new Date();
      const periodEnd = parsedDueDate ?? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

      const assignment = await TaskAssignment.create({
        taskId: task.id,
        userId: (req as any).user.id,
        colocationId,
        periodStart: now,
        periodEnd,
        taskTitleSnapshot: task.title,
        taskWeightSnapshot: task.weight,
        generationMethod: 'manual',
      });

      res.status(201).json({ task, assignment });
      return;
    }

    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
};

/**
 * US-17 (modification) — PATCH /api/tasks/:id
 * Modifie le template Task : title, description, dueDate uniquement.
 * Les TaskAssignments existantes conservent leurs snapshots.
 */
export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = (req as any).task as Task;
    const { title, description, dueDate } = req.body;
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
 * US-17 (suppression template) — DELETE /api/tasks/:id
 * Soft delete du template + soft delete de toutes les TaskAssignments liées.
 * Le scheduler recalculera la rotation sans cette tâche au prochain tick.
 */
export const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = (req as any).task as Task;

    await TaskAssignment.destroy({
      where: { taskId: task.id },
    });

    await task.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};