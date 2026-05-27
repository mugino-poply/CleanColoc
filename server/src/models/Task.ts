import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

type RecurringInterval = 'daily' | 'weekly' | 'biweekly' | 'monthly';

interface TaskAttributes {
  id: string;
  title: string;
  description?: string;
  colocationId: string;
  isRecurring: boolean;
  recurringInterval?: RecurringInterval;
  dueDate?: Date;
  weight: number;
  deletedAt?: Date;
}

interface TaskCreationAttributes extends Optional<TaskAttributes, 'id' | 'weight'> {}

class Task extends Model<TaskAttributes, TaskCreationAttributes>
  implements TaskAttributes {
  public id!: string;
  public title!: string;
  public description?: string;
  public colocationId!: string;
  public isRecurring!: boolean;
  public recurringInterval?: RecurringInterval;
  public dueDate?: Date;
  public weight!: number;
  public deletedAt?: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Task.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    colocationId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    recurringInterval: {
      type: DataTypes.ENUM('daily', 'weekly', 'biweekly', 'monthly'),
      allowNull: true,
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    weight: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    tableName: 'Tasks',
    modelName: 'Task',
    paranoid: true,
  }
);

export default Task;