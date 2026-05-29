import { Request, Response, NextFunction } from 'express';
// On importe le modèle User de Sequelize exactement comme dans ton contrôleur
import User from '../models/user'; 

export const isAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Récupérer l'ID de l'utilisateur extrait par authenticateToken
    const userId = (req as any).user?.id || (req as any).userId;

    if (!userId) {
      res.status(401).json({ message: "Authentification requise." });
      return;
    }

    // 2. Chercher l'utilisateur avec Sequelize grâce à son ID (Primary Key)
    const user = await User.findByPk(userId);

    if (!user) {
      res.status(404).json({ message: "Utilisateur introuvable." });
      return;
    }

    // 3. Récupérer l'email configuré dans ton fichier .env
    const adminEmailsConfig = process.env.ADMIN_EMAILS ?? '';
    
    // On vérifie si l'email de l'utilisateur correspond à celui du .env
    if (user.email === adminEmailsConfig) {
      return next(); // C'est bon, l'email correspond ! On donne l'accès.
    }

    // Sécurité bonus si jamais le rôle est aussi stocké dans un attribut "role" du modèle
    if ((user as any).role === 'ADMIN' || (user as any).role === 'admin') {
      return next();
    }

    // 4. Si l'email ne correspond pas, on bloque avec un 403
    res.status(403).json({ 
      message: `Accès refusé. L'email ${user.email} n'est pas configuré comme administrateur.` 
    });
    return;

  } catch (error) {
    console.error("Erreur dans le middleware isAdmin :", error);
    res.status(500).json({ message: "Erreur serveur lors de la vérification des droits admin." });
    return;
  }
};