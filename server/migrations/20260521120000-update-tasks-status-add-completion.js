'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Supprimer le défaut AVANT de changer le type
    //    (sinon PostgreSQL refuse car le défaut référence l'ancien type)
    await queryInterface.sequelize.query(`
      ALTER TABLE "Tasks" ALTER COLUMN status DROP DEFAULT;
    `);

    // 2. Renommer l'ancien type, créer le nouveau, migrer les données
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Tasks_status" RENAME TO "enum_Tasks_status_old";
    `);
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_Tasks_status" AS ENUM('à faire', 'terminée');
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "Tasks"
        ALTER COLUMN status TYPE "enum_Tasks_status"
        USING CASE
          WHEN status::text = 'pending'     THEN 'à faire'
          WHEN status::text = 'in_progress' THEN 'à faire'
          WHEN status::text = 'done'        THEN 'terminée'
          ELSE 'à faire'
        END::"enum_Tasks_status";
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "Tasks" ALTER COLUMN status SET DEFAULT 'à faire';
    `);
    await queryInterface.sequelize.query(`
      DROP TYPE "enum_Tasks_status_old";
    `);

    // 3. Ajouter completedAt — date à laquelle la tâche a été marquée terminée
    await queryInterface.addColumn('Tasks', 'completedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // 4. Ajouter completedBy — UUID de l'utilisateur qui a complété la tâche
    await queryInterface.addColumn('Tasks', 'completedBy', {
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
    await queryInterface.removeColumn('Tasks', 'completedBy');
    await queryInterface.removeColumn('Tasks', 'completedAt');

    await queryInterface.sequelize.query(`
      ALTER TABLE "Tasks" ALTER COLUMN status DROP DEFAULT;
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Tasks_status" RENAME TO "enum_Tasks_status_old";
    `);
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_Tasks_status" AS ENUM('pending', 'in_progress', 'done');
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "Tasks"
        ALTER COLUMN status TYPE "enum_Tasks_status"
        USING CASE
          WHEN status::text = 'à faire'  THEN 'pending'
          WHEN status::text = 'terminée' THEN 'done'
          ELSE 'pending'
        END::"enum_Tasks_status";
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "Tasks" ALTER COLUMN status SET DEFAULT 'pending';
    `);
    await queryInterface.sequelize.query(`
      DROP TYPE "enum_Tasks_status_old";
    `);
  },
};