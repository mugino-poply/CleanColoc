import { Router } from 'express';
import { checkIdParam } from '../middlewares/checkIdParam';
import { authenticateToken } from '../middlewares/authMiddleware';
import { requireColocationMember } from '../middlewares/requireColocationMember';
import {
  updateTask,
  assignTask,
  completeTask,
  deleteTask,
} from '../controllers/taskController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Gestion des tâches ménagères d'une colocation
 */

/**
 * @swagger
 * /api/tasks/{id}:
 *   patch:
 *     summary: Modifier une tâche (titre, description, date d'échéance)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Tâche mise à jour
 *       400:
 *         description: Champs invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non membre de la colocation
 *       404:
 *         description: Tâche introuvable
 *       500:
 *         description: Erreur serveur
 */
router.patch(
  '/:id',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  updateTask
);

/**
 * @swagger
 * /api/tasks/{id}/assign:
 *   patch:
 *     summary: Assigner ou désassigner une tâche à un membre de la colocation
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignedTo
 *             properties:
 *               assignedTo:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: UUID d'un membre de la colocation, ou null pour désassigner
 *     responses:
 *       200:
 *         description: Tâche assignée ou désassignée
 *       400:
 *         description: Champ assignedTo manquant, mal formé, ou utilisateur non membre
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non membre de la colocation
 *       404:
 *         description: Tâche introuvable
 *       500:
 *         description: Erreur serveur
 */
router.patch(
  '/:id/assign',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  assignTask
);

/**
 * @swagger
 * /api/tasks/{id}/complete:
 *   patch:
 *     summary: Basculer le statut d'une tâche entre 'à faire' et 'terminée'
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Statut basculé
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non membre de la colocation
 *       404:
 *         description: Tâche introuvable
 *       409:
 *         description: Conflit — un autre membre a déjà modifié le statut
 *       500:
 *         description: Erreur serveur
 */
router.patch(
  '/:id/complete',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  completeTask
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Supprimer une tâche (soft delete)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Tâche supprimée
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non membre de la colocation
 *       404:
 *         description: Tâche introuvable
 *       500:
 *         description: Erreur serveur
 */
router.delete(
  '/:id',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  deleteTask
);

export default router;