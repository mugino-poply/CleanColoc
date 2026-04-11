import { Sequelize, DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';


class User extends Model {
    declare id: number; 
    declare nom: string; 
    declare prenom: string;
    declare createdAt: Date;
}

User.init(
    {
        nom: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        prenom: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: 'User',
    },
);

console.log(User === sequelize.models.User);

export default User;