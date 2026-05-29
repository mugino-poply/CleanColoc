import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './user';
import Expense from './Expense';

interface ExpenseShareAttributes {
  id: string;
  expenseId: string;
  userId?: string | null;
  userSnapshot: string;
  amount: number;
  deletedAt?: Date;
}

interface ExpenseShareCreationAttributes extends Optional<ExpenseShareAttributes, 'id' | 'userId'> {}

class ExpenseShare extends Model<ExpenseShareAttributes, ExpenseShareCreationAttributes>
  implements ExpenseShareAttributes {
  public id!: string;
  public expenseId!: string;
  public userId?: string | null;
  public userSnapshot!: string;
  public amount!: number;
  public deletedAt?: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ExpenseShare.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    expenseId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    userSnapshot: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'ExpenseShare',
    tableName: 'ExpenseShares',
    paranoid: true,
  }
);

ExpenseShare.belongsTo(User, { foreignKey: 'userId', as: 'user' });
ExpenseShare.belongsTo(Expense, { foreignKey: 'expenseId', as: 'expense' });

// Déclaré ici pour éviter l'import circulaire entre Expense et ExpenseShare
Expense.hasMany(ExpenseShare, { foreignKey: 'expenseId', as: 'shares' });

export default ExpenseShare;