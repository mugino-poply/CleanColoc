import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';
import { AuthService } from '../services/authService';

export class UserController {
  /**
   * Inscription d'un nouvel utilisateur
   * Répond à la contrainte de création de compte du cahier des charges.
   */
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      // Appel au service pour la logique métier (hachage, vérification email)
      const user = await UserService.registerUser(req.body);

      res.status(201).json({
        message: "Utilisateur créé avec succès",
        data: user
      });
    } catch (error) {
      // Centralisation de l'erreur vers le middleware errorHandler
      next(error);
    }
  }

  /**
   * Connexion de l'utilisateur
   * Gère l'Access Token (JSON) et le Refresh Token (Cookie HttpOnly)
   */
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { mail_user, password_user } = req.body;

      // Authentification via le service dédié
      const { user, accessToken, refreshToken } = await AuthService.login(mail_user, password_user);

      // Stockage du Refresh Token en Cookie sécurisé (Protection OWASP A02) 
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS en production uniquement
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
      });

      res.status(200).json({
        message: "Connexion réussie",
        accessToken,
        user: { 
          id: user.id_user, 
          nom: user.nom_user,
          email: user.mail_user 
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Récupération du profil utilisateur
   * Protégé par la validation d'ID (Middleware checkIdParam)
   */
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      // Cast en string pour corriger l'erreur de type TypeScript
      const userId = req.params.id as string;

      if (!userId) {
        const error: any = new Error("ID utilisateur manquant");
        error.status = 400;
        throw error;
      }

      const user = await UserService.getUserById(userId);

      res.status(200).json({
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Déconnexion
   * Supprime le cookie du Refresh Token.
   */
  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie('refreshToken');
      res.status(200).json({ message: "Déconnexion réussie" });
    } catch (error) {
      next(error);
    }
  }
}