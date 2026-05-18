import User from '../models/user';

export class UserService {
  static async registerUser(userData: any) {
    const existingUser = await User.findOne({
      where: { email: userData.email },
    });

    if (existingUser) {
      const error: any = new Error("Cet email est déjà utilisé");
      error.status = 400;
      throw error;
    }

    const newUser = await User.create({
      username: userData.username,
      email: userData.email,
      password: userData.password,
      avatarUrl: userData.avatarUrl || undefined,
    });

    const { password, ...userWithoutPassword } = newUser.toJSON();
    return userWithoutPassword;
  }

  static async getUserById(id: string) {
    const user = await User.findByPk(id, {
      attributes: ['id', 'username', 'email', 'avatarUrl', 'createdAt'],
    });
    if (!user) {
      const error: any = new Error("Utilisateur non trouvé");
      error.status = 404;
      throw error;
    }
    return user;
  }
}