import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Colocation from './Colocation';

interface MembershipAttributes {
  id: string;
  userId: string;
  colocationId: string;
  role: 'admin' | 'member';
  deletedAt?: Date;
}

interface MembershipCreationAttributes extends Optional<MembershipAttributes, 'id'> {}

class Membership extends Model<MembershipAttributes, MembershipCreationAttributes>
  implements MembershipAttributes {
  public id!: string;
  public userId!: string;
  public colocationId!: string;
  public role!: 'admin' | 'member';
  public deletedAt?: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Propriété peuplée par Sequelize lors d'un include
  public colocation?: Colocation;
}

Membership.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    role: {
      type: DataTypes.ENUM('admin', 'member'),
      allowNull: false,
      defaultValue: 'member',
    },
  },
  {
    sequelize,
    tableName: 'Memberships',
    modelName: 'Membership',
    paranoid: true,
  }
);

Membership.belongsTo(Colocation, {
  foreignKey: 'colocationId',
  as: 'colocation',
});

export default Membership;