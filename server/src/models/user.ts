import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcrypt';

class User extends Model {
  public id_user!: string;
  public nom_user!: string;
  public mail_user!: string;
  public password_user!: string;
  public avatar_url?: string;
  public readonly date_creation!: Date;

  // Vérification du mot de passe (Sécurité OWASP A02)
  public async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password_user);
  }
}

User.init({
  id_user: {
    type: DataTypes.TEXT,
    primaryKey: true,
    allowNull: false,
  },
  nom_user: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  mail_user: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password_user: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  avatar_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  date_creation: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'Users', // Doit correspondre exactement au nom dans Supabase
  timestamps: false,  // On désactive les colonnes createdAt/updatedAt par défaut de Sequelize
  hooks: {
    // Hachage du mot de passe avant sauvegarde (Sécurité A02)
    beforeCreate: async (user: User) => {
      const salt = await bcrypt.genSalt(10);
      user.password_user = await bcrypt.hash(user.password_user, salt);
    },
    beforeUpdate: async (user: User) => {
      if (user.changed('password_user')) {
        const salt = await bcrypt.genSalt(10);
        user.password_user = await bcrypt.hash(user.password_user, salt);
      }
    }
  }
});

export default User;