'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ----------------------------------------------------------------
    // 0. Truncate Tasks (données de test uniquement)
    // ----------------------------------------------------------------
    await queryInterface.sequelize.query('TRUNCATE TABLE "Tasks" CASCADE;');

    // ----------------------------------------------------------------
    // 1. Suppression des colonnes qui migrent vers TaskAssignments
    // ----------------------------------------------------------------
    await queryInterface.removeColumn('Tasks', 'status');
    await queryInterface.removeColumn('Tasks', 'assignedTo');
    await queryInterface.removeColumn('Tasks', 'completedAt');
    await queryInterface.removeColumn('Tasks', 'completedBy');

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Tasks_status";'
    );

    // ----------------------------------------------------------------
    // 2. Ajout de weight sur Tasks
    // ----------------------------------------------------------------
    await queryInterface.addColumn('Tasks', 'weight', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });

    // ----------------------------------------------------------------
    // 3. Conversion recurringInterval VARCHAR → ENUM strict
    //    Sequelize crée le type automatiquement via addColumn
    // ----------------------------------------------------------------
    await queryInterface.removeColumn('Tasks', 'recurringInterval');
    await queryInterface.addColumn('Tasks', 'recurringInterval', {
      type: Sequelize.ENUM('daily', 'weekly', 'biweekly', 'monthly'),
      allowNull: true,
    });

    // ----------------------------------------------------------------
    // 4. autoRotation sur Colocations
    // ----------------------------------------------------------------
    await queryInterface.addColumn('Colocations', 'autoRotation', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    // ----------------------------------------------------------------
    // 5. Création de la table TaskAssignments
    //    Sequelize crée les types ENUM automatiquement via createTable
    // ----------------------------------------------------------------
    await queryInterface.createTable('TaskAssignments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      taskId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tasks', key: 'id' },
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      colocationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Colocations', key: 'id' },
        onDelete: 'CASCADE',
      },
      periodStart: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      periodEnd: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('à faire', 'terminée', 'manquée'),
        allowNull: false,
        defaultValue: 'à faire',
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      taskTitleSnapshot: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      taskWeightSnapshot: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      generationMethod: {
        type: Sequelize.ENUM('auto', 'manual'),
        allowNull: false,
        defaultValue: 'manual',
      },
      transferredFromUserId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onDelete: 'SET NULL',
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

    // ----------------------------------------------------------------
    // 6. Contrainte d'idempotence + index de performance
    // ----------------------------------------------------------------
    await queryInterface.addConstraint('TaskAssignments', {
      fields: ['taskId', 'periodStart'],
      type: 'unique',
      name: 'unique_task_period',
    });

    await queryInterface.addIndex(
      'TaskAssignments',
      ['colocationId', 'periodStart', 'periodEnd'],
      { name: 'idx_assignments_coloc_period' }
    );
    await queryInterface.addIndex(
      'TaskAssignments',
      ['taskId', 'userId'],
      { name: 'idx_assignments_task_user' }
    );
    await queryInterface.addIndex(
      'TaskAssignments',
      ['userId', 'status'],
      { name: 'idx_assignments_user_status' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('TaskAssignments');

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_TaskAssignments_status";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_TaskAssignments_generationMethod";'
    );

    await queryInterface.removeColumn('Colocations', 'autoRotation');

    await queryInterface.removeColumn('Tasks', 'recurringInterval');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Tasks_recurringInterval";'
    );
    await queryInterface.addColumn('Tasks', 'recurringInterval', {
      type: require('sequelize').DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.removeColumn('Tasks', 'weight');

    await queryInterface.sequelize.query(
      `CREATE TYPE "enum_Tasks_status" AS ENUM ('à faire', 'terminée');`
    );
    await queryInterface.addColumn('Tasks', 'status', {
      type: require('sequelize').DataTypes.ENUM('à faire', 'terminée'),
      allowNull: false,
      defaultValue: 'à faire',
    });
    await queryInterface.addColumn('Tasks', 'assignedTo', {
      type: require('sequelize').DataTypes.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('Tasks', 'completedAt', {
      type: require('sequelize').DataTypes.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('Tasks', 'completedBy', {
      type: require('sequelize').DataTypes.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onDelete: 'SET NULL',
    });
  },
};