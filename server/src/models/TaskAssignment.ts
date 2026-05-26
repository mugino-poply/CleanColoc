import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Task from './Task';


type AssignmentStatus = 'à faire' | 'terminée' | 'manquée';
type GenerationMethod = 'auto' | 'manual';

interface TaskAssignmentAttributes {
  id: string;
  taskId: string;
  userId: string;
  colocationId: string;
  periodStart: Date;
  periodEnd: Date;
  status: AssignmentStatus;
  completedAt?: Date;
  taskTitleSnapshot: string;
  taskWeightSnapshot: number;
  generationMethod: GenerationMethod;
  transferredFromUserId?: string;
  deletedAt?: Date;
}

interface TaskAssignmentCreationAttributes
  extends Optional<TaskAssignmentAttributes, 'id' | 'status' | 'taskWeightSnapshot' | 'generationMethod' | 'completedAt' | 'transferredFromUserId' | 'deletedAt'> {}

class TaskAssignment
  extends Model<TaskAssignmentAttributes, TaskAssignmentCreationAttributes>
  implements TaskAssignmentAttributes
{
  public id!: string;
  public taskId!: string;
  public userId!: string;
  public colocationId!: string;
  public periodStart!: Date;
  public periodEnd!: Date;
  public status!: AssignmentStatus;
  public completedAt?: Date;
  public taskTitleSnapshot!: string;
  public taskWeightSnapshot!: number;
  public generationMethod!: GenerationMethod;
  public transferredFromUserId?: string;
  public deletedAt?: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

TaskAssignment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    taskId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    colocationId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    periodStart: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    periodEnd: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('à faire', 'terminée', 'manquée'),
      allowNull: false,
      defaultValue: 'à faire',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    taskTitleSnapshot: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    taskWeightSnapshot: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    generationMethod: {
      type: DataTypes.ENUM('auto', 'manual'),
      allowNull: false,
      defaultValue: 'manual',
    },
    transferredFromUserId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'TaskAssignments',
    modelName: 'TaskAssignment',
    paranoid: true,
  }
);

TaskAssignment.belongsTo(Task, {
  foreignKey: 'taskId',
  as: 'task',
});

Task.hasMany(TaskAssignment, {
  foreignKey: 'taskId',
  as: 'assignments',
});

export default TaskAssignment;