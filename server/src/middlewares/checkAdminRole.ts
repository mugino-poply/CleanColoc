import { Request, Response, NextFunction } from 'express';

export const checkAdminRole = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const role = (req as any).role;

  if (role !== 'admin') {
    res.status(403).json({ error: "Accès réservé à l'administrateur de la colocation." });
    return;
  }

  next();
};