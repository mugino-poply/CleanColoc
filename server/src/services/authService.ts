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
}