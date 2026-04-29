import jwt from 'jsonwebtoken';
import User from '../models/user';

export class AuthService {
  /**
   * Génère un Access Token (Durée courte : 15 min)
   * Utilisé pour chaque requête vers le serveur
   */
  static generateAccessToken(userId: string) {
    return jwt.sign(
      { id: userId }, 
      process.env.JWT_ACCESS_SECRET || 'secret_temporaire_access', 
      { expiresIn: '15m' }
    );
  }

  /**
   * Génère un Refresh Token (Durée longue : 7 jours)
   * Stocké dans un cookie sécurisé pour renouveler l'Access Token
   */
  static generateRefreshToken(userId: string) {
    return jwt.sign(
      { id: userId }, 
      process.env.JWT_REFRESH_SECRET || 'secret_temporaire_refresh', 
      { expiresIn: '7d' }
    );
  }

  /**
   * Logique de connexion
   */
  static async login(mail: string, pass: string) {
    // 1. Chercher l'utilisateur par son mail
    const user = await User.findOne({ where: { mail_user: mail } });
    
    // 2. Vérifier si l'utilisateur existe et si le mot de passe match
    // On utilise la méthode comparePassword qu'on a créée dans le modèle User
    if (!user || !(await user.comparePassword(pass))) {
      const error: any = new Error("Identifiants incorrects");
      error.status = 401;
      throw error;
    }

    // 3. Générer les deux tokens
    const accessToken = this.generateAccessToken(user.id_user);
    const refreshToken = this.generateRefreshToken(user.id_user);

    return { user, accessToken, refreshToken };
  }
}