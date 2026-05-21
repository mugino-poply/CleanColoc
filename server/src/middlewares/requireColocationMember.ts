import type { Request, Response, NextFunction } from 'express';
import Membership from '../models/Membership';
import Task from '../models/Task';

/**
 * Vérifie que l'utilisateur authentifié est membre de la colocation visée.
 *
 * Source de l'ID de colocation, par ordre de priorité :
 *   1. req.params.colocationId  (routes /api/colocations/:colocationId/...)
 *   2. req.params.id            (routes /api/colocations/:id)
 *   3. Pour les routes /api/tasks/:id — résolution via la Task
 *
 * Requiert authenticateToken en amont (lit req.user.id).
 * Pose req.colocationId et req.role sur la requête pour les controllers en aval.
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

    // Résolution de l'id de colocation selon la route
    let colocationId: string | undefined =
      (req.params['colocationId'] as string | undefined) ??
      (req.params['id'] as string | undefined);

    // Cas des routes /api/tasks/:id — on récupère colocationId via la Task
    const isTaskRoute = req.baseUrl.endsWith('/tasks');
    if (isTaskRoute) {
      const taskId = req.params['id'] as string | undefined;
      if (!taskId) {
        res.status(400).json({ message: 'ID de tâche manquant.' });
        return;
      }
      const task = await Task.findByPk(taskId)
      if (!task) {
        res.status(404).json({ message: 'Tâche introuvable.' });
        return;
      }
      colocationId = task.colocationId;
      // On stocke la tâche pour éviter un second findByPk dans le controller
      (req as any).task = task;
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

    // Données utiles pour les controllers en aval
    (req as any).colocationId = colocationId;
    (req as any).role = membership.role;

    next();
  } catch (error) {
    next(error);
  }
};