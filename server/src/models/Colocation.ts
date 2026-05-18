import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ColocationAttributes {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  deletedAt?: Date;
}

interface ColocationCreationAttributes extends Optional<ColocationAttributes, 'id'> {}

class Colocation extends Model<ColocationAttributes, ColocationCreationAttributes>
  implements ColocationAttributes {
  public id!: string;
  public name!: string;
  public description?: string;
  public inviteCode!: string;
  public deletedAt?: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Colocation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    inviteCode: {
      type: DataTypes.STRING(8),
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize,
    tableName: 'Colocations',
    modelName: 'Colocation',
    paranoid: true,
  }
);

export default Colocation;