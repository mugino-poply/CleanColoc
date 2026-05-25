import jwt from 'jsonwebtoken';
import User from '../models/user';

export class AuthService {
  static generateAccessToken(userId: string) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_ACCESS_SECRET || 'secret_temporaire_access',
      { expiresIn: '15m' }
    );
  }

  static generateRefreshToken(userId: string) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_REFRESH_SECRET || 'secret_temporaire_refresh',
      { expiresIn: '7d' }
    );
  }

  static async login(email: string, password: string) {
    const user = await User.findOne({ where: { email } });

    if (!user || !(await user.comparePassword(password))) {
      const error: any = new Error("Identifiants incorrects");
      error.status = 401;
      throw error;
    }

    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    return { user, accessToken, refreshToken };
  }

  static async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'secret_temporaire_refresh'
      );
    } catch {
      const error: any = new Error("Refresh token invalide ou expiré");
      error.status = 401;
      throw error;
    }

    const user = await User.findOne({ where: { id: payload.id } });
    if (!user) {
      const error: any = new Error("Utilisateur introuvable");
      error.status = 401;
      throw error;
    }

    const accessToken = this.generateAccessToken(user.id);
    return { user, accessToken };
  }
}