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
  
  static async updateUser(id: string, data: { username?: string; avatarUrl?: string }) {
  const user = await User.findByPk(id);
  if (!user) {
    const error: any = new Error("Utilisateur non trouvé");
    error.status = 404;
    throw error;
  }
  if (data.username !== undefined) user.username = data.username;
  if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
  await user.save();
  const { password, ...userWithoutPassword } = (user.toJSON() as any);
  return userWithoutPassword;
}

static async deleteUser(id: string, password: string) {
  const user = await User.findByPk(id);
  if (!user) {
    const error: any = new Error("Utilisateur non trouvé");
    error.status = 404;
    throw error;
  }
  const passwordMatch = await user.comparePassword(password);
  if (!passwordMatch) {
    const error: any = new Error("Mot de passe incorrect");
    error.status = 401;
    throw error;
  }
  await user.destroy();
}
}