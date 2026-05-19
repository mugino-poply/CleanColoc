import type { Request, Response, NextFunction } from 'express';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const checkIdParam = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const id = req.params.id;

  if (!id) {
    res.status(400).json({ error: 'ID manquant.' });
    return;
  }

  if (!UUID_REGEX.test(id)) {
    res.status(400).json({ error: 'ID invalide (format UUID attendu).' });
    return;
  }

  next();
};