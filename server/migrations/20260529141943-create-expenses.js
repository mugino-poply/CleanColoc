'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Expenses', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Montant en centimes (ex: 4250 = 42,50 €)',
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Date de la dépense au format YYYY-MM-DD',
      },
      payerId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      payerSnapshot: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Username du payeur au moment de la création — immuable',
      },
      colocationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Colocations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    await queryInterface.addIndex('Expenses', ['colocationId']);
    await queryInterface.addIndex('Expenses', ['payerId']);
    await queryInterface.addIndex('Expenses', ['date']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Expenses');
  },
};
