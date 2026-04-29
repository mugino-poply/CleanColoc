import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  // Récupération du token depuis le header Authorization ou les cookies
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Accès refusé. Token manquant." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    (req as any).user = decoded; // On stocke les infos de l'utilisateur dans la requête
    next(); // On passe à la suite (le contrôleur)
  } catch (err) {
    return res.status(403).json({ message: "Token invalide ou expiré." });
  }
};