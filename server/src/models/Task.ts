import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TaskAttributes {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'done';
  assignedTo?: string;
  colocationId: string;
  isRecurring: boolean;
  recurringInterval?: string;
  dueDate?: Date;
  deletedAt?: Date;
}

interface TaskCreationAttributes extends Optional<TaskAttributes, 'id'> {}

class Task extends Model<TaskAttributes, TaskCreationAttributes>
  implements TaskAttributes {
  public id!: string;
  public title!: string;
  public description?: string;
  public status!: 'pending' | 'in_progress' | 'done';
  public assignedTo?: string;
  public colocationId!: string;
  public isRecurring!: boolean;
  public recurringInterval?: string;
  public dueDate?: Date;
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
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'done'),
      allowNull: false,
      defaultValue: 'pending',
    },
    assignedTo: {
      type: DataTypes.UUID,
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
    paranoid: true,
  }
);

export default Task;