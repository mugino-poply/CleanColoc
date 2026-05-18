import type { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';
import { AuthService } from '../services/authService';

export class UserController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.registerUser(req.body);
      res.status(201).json({
        message: "Utilisateur créé avec succès",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const { user, accessToken, refreshToken } = await AuthService.login(email, password);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        message: "Connexion réussie",
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.id;
      const user = await UserService.getUserById(userId);
      res.status(200).json({ data: user });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie('refreshToken');
      res.status(200).json({ message: "Déconnexion réussie" });
    } catch (error) {
      next(error);
    }
  }
}