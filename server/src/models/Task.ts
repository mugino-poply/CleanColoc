import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TaskAttributes {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'done';
  assignedTo?: number;
  colocId: number;
  isRecurring: boolean;
  recurringInterval?: string;
  dueDate?: Date;
}

interface TaskCreationAttributes extends Optional<TaskAttributes, 'id'> {}

class Task extends Model<TaskAttributes, TaskCreationAttributes>
  implements TaskAttributes {
  public id!: number;
  public title!: string;
  public description?: string;
  public status!: 'pending' | 'in_progress' | 'done';
  public assignedTo?: number;
  public colocId!: number;
  public isRecurring!: boolean;
  public recurringInterval?: string;
  public dueDate?: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Task.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'done'),
      allowNull: false,
      defaultValue: 'pending',
    },
    assignedTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    colocId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    recurringInterval: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'Tasks',
    modelName: 'Task',
  }
);

export default Task;