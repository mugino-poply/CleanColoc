import { Router } from 'express';
import { checkIdParam } from '../middlewares/checkIdParam';
import { authenticateToken } from '../middlewares/authMiddleware';
import { requireColocationMember } from '../middlewares/requireColocationMember';
import {
  updateTask,
  deleteTask,
} from '../controllers/taskController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Gestion des templates de tâches
 */

/**
 * @swagger
 * /api/tasks/{id}:
 *   patch:
 *     summary: Modifier un template de tâche (titre, description, date d'échéance)
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
 *         description: Template mis à jour
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
 * /api/tasks/{id}:
 *   delete:
 *     summary: Supprimer un template de tâche et toutes ses assignations (soft delete)
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
 *         description: Template supprimé
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