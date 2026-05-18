'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Tasks', 'colocationId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Colocations',
        key: 'id',
      },
      onDelete: 'CASCADE',
    });

    await queryInterface.addColumn('Tasks', 'assignedTo', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Tasks', 'colocationId');
    await queryInterface.removeColumn('Tasks', 'assignedTo');
  },
};