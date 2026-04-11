'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
        id: {
          type: Sequelize.INTEGER, 
          primaryKey: true, 
          autoIncrement: true, 
          allowNull: false,
        }, 
        nom: {
          type: Sequelize.STRING, 
          allowNull: false,
        },
        prenom: {
          type: Sequelize.STRING, 
          allowNull: false,
        }
      }
    );
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('Users');
  }
};
