import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TaskAttributes {
  id: string;
  title: string;
  description?: string;
  status: 'à faire' | 'terminée';
  assignedTo?: string;
  colocationId: string;
  isRecurring: boolean;
  recurringInterval?: string;
  dueDate?: Date;
  completedAt?: Date;
  completedBy?: string;
  deletedAt?: Date;
}

interface TaskCreationAttributes extends Optional<TaskAttributes, 'id'> {}

class Task extends Model<TaskAttributes, TaskCreationAttributes>
  implements TaskAttributes {
  public id!: string;
  public title!: string;
  public description?: string;
  public status!: 'à faire' | 'terminée';
  public assignedTo?: string;
  public colocationId!: string;
  public isRecurring!: boolean;
  public recurringInterval?: string;
  public dueDate?: Date;
  public completedAt?: Date;
  public completedBy?: string;
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
      type: DataTypes.ENUM('à faire', 'terminée'),
      allowNull: false,
      defaultValue: 'à faire',
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
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedBy: {
      type: DataTypes.UUID,
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