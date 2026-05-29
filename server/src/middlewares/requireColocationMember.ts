import type { Request, Response, NextFunction } from 'express';
import Membership from '../models/Membership';
import Task from '../models/Task';
import TaskAssignment from '../models/TaskAssignment';
import Expense from '../models/Expense';

/**
 * Vérifie que l'utilisateur authentifié est membre de la colocation visée.
 *
 * Source de l'ID de colocation, par ordre de priorité :
 *   1. req.params.colocationId  (routes /api/colocations/:colocationId/...)
 *   2. req.params.id            (routes /api/colocations/:id)
 *   3. Routes /api/tasks/:id    — résolution via la Task
 *   4. Routes /api/assignments/:id — résolution via la TaskAssignment
 *   5. Routes /api/expenses/:id — résolution via l'Expense
 *
 * Requiert authenticateToken en amont (lit req.user.id).
 * Pose req.colocationId, req.role, et req.task / req.assignment / req.expense sur la requête.
 */
export const requireColocationMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      res.status(401).json({ message: 'Non authentifié.' });
      return;
    }

    let colocationId: string | undefined =
      (req.params['colocationId'] as string | undefined) ??
      (req.params['id'] as string | undefined);

    const isTaskRoute = req.baseUrl.endsWith('/tasks');
    const isAssignmentRoute = req.baseUrl.endsWith('/assignments');
    const isExpenseRoute = req.baseUrl.endsWith('/expenses');

    if (isTaskRoute) {
      const taskId = req.params['id'] as string | undefined;
      if (!taskId) {
        res.status(400).json({ message: 'ID de tâche manquant.' });
        return;
      }
      const task = await Task.findByPk(taskId);
      if (!task) {
        res.status(404).json({ message: 'Tâche introuvable.' });
        return;
      }
      colocationId = task.colocationId;
      (req as any).task = task;
    } else if (isAssignmentRoute) {
      const assignmentId = req.params['id'] as string | undefined;
      if (!assignmentId) {
        res.status(400).json({ message: "ID d'assignation manquant." });
        return;
      }
      const assignment = await TaskAssignment.findByPk(assignmentId);
      if (!assignment) {
        res.status(404).json({ message: 'Assignation introuvable.' });
        return;
      }
      colocationId = assignment.colocationId;
      (req as any).assignment = assignment;
    } else if (isExpenseRoute) {
      const expenseId = req.params['id'] as string | undefined;
      if (!expenseId) {
        res.status(400).json({ message: 'ID de dépense manquant.' });
        return;
      }
      const expense = await Expense.findByPk(expenseId);
      if (!expense) {
        res.status(404).json({ message: 'Dépense introuvable.' });
        return;
      }
      colocationId = expense.colocationId;
      (req as any).expense = expense;
    }

    if (!colocationId) {
      res.status(400).json({ message: 'ID de colocation manquant.' });
      return;
    }

    const membership = await Membership.findOne({
      where: { userId, colocationId },
      attributes: ['id', 'role', 'colocationId'],
    });

    if (!membership) {
      res.status(403).json({
        message: "Vous n'êtes pas membre de cette colocation.",
      });
      return;
    }

    (req as any).colocationId = colocationId;
    (req as any).role = membership.role;

    next();
  } catch (error) {
    next(error);
  }
};