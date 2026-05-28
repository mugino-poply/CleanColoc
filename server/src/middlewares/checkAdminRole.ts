import { Request, Response, NextFunction } from 'express';
import Membership from '../models/Membership';

export const checkAdminRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const colocationId = req.params.id;

    if (!userId) {
      res.status(401).json({ error: 'Non authentifié.' });
      return;
    }

    const membership = await Membership.findOne({
      where: { userId, colocationId },
    });

    if (!membership || membership.role !== 'admin') {
      res.status(403).json({ error: 'Accès réservé à l\'administrateur de la colocation.' });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};