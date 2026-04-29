import User from '../models/user.js';
import { v4 as uuidv4 } from 'uuid'; // Si tu veux générer des IDs textuels uniques

export class UserService {
  /**
   * Crée un nouvel utilisateur dans la base de données
   * Logique métier : vérification d'existence, génération d'ID
   */
  static async registerUser(userData: any) {
    // 1. Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ 
      where: { mail_user: userData.mail_user } 
    });

    if (existingUser) {
      const error: any = new Error("Cet email est déjà utilisé");
      error.status = 400;
      throw error;
    }

    // 2. Préparation des données (on génère un ID car ta table attend un texte)
    const newUser = await User.create({
      id_user: uuidv4(), // Génère un ID unique type string
      nom_user: userData.nom_user,
      mail_user: userData.mail_user,
      password_user: userData.password_user, // Le hook dans le modèle va le hacher !
      avatar_url: userData.avatar_url || null
    });

    // 3. On retourne l'utilisateur sans le mot de passe pour la sécurité
    const { password_user, ...userWithoutPassword } = newUser.toJSON();
    return userWithoutPassword;
  }

  /**
   * Récupère un utilisateur par son ID
   */
  static async getUserById(id: string) {
    const user = await User.findByPk(id);
    if (!user) {
      const error: any = new Error("Utilisateur non trouvé");
      error.status = 404;
      throw error;
    }
    return user;
  }
}