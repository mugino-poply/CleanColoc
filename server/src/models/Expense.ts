import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './user';
import Colocation from './Colocation';

interface ExpenseAttributes {
  id: string;
  title: string;
  amount: number;
  category: string;
  description?: string | null;
  date: string;
  payerId?: string | null;
  payerSnapshot: string;
  colocationId: string;
  deletedAt?: Date;
}

interface ExpenseCreationAttributes extends Optional<ExpenseAttributes, 'id' | 'payerId' | 'description'> {}

class Expense extends Model<ExpenseAttributes, ExpenseCreationAttributes>
  implements ExpenseAttributes {
  public id!: string;
  public title!: string;
  public amount!: number;
  public category!: string;
  public description?: string | null;
  public date!: string;
  public payerId?: string | null;
  public payerSnapshot!: string;
  public colocationId!: string;
  public deletedAt?: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Expense.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    payerId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    payerSnapshot: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    colocationId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Expense',
    tableName: 'Expenses',
    paranoid: true,
  }
);

Expense.belongsTo(User, { foreignKey: 'payerId', as: 'payer' });
Expense.belongsTo(Colocation, { foreignKey: 'colocationId', as: 'colocation' });

export default Expense;