'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ExpenseShares', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      expenseId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Expenses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      userSnapshot: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Username du membre concerné au moment de la création',
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Part calculée en centimes — snapshot immuable',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('ExpenseShares', ['expenseId']);
    await queryInterface.addIndex('ExpenseShares', ['userId']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ExpenseShares');
  },
};