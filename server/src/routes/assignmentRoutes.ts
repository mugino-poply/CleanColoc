import { Router } from 'express';
import { checkIdParam } from '../middlewares/checkIdParam';
import { authenticateToken } from '../middlewares/authMiddleware';
import { requireColocationMember } from '../middlewares/requireColocationMember';
import {
  assignTask,
  completeTask,
  deleteAssignment,
} from '../controllers/assignmentController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Assignments
 *   description: Gestion des assignations de tâches
 */

/**
 * @swagger
 * /api/assignments/{id}/assign:
 *   patch:
 *     summary: Réassigner une TaskAssignment à un membre
 *     tags: [Assignments]
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
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Assignation mise à jour
 *       400:
 *         description: userId manquant, mal formé, ou utilisateur non membre
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non membre de la colocation
 *       404:
 *         description: Assignation introuvable
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
 * /api/assignments/{id}/complete:
 *   patch:
 *     summary: Basculer le statut d'une assignation entre 'à faire' et 'terminée'
 *     tags: [Assignments]
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
 *         description: Assignation introuvable
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
 * /api/assignments/{id}:
 *   delete:
 *     summary: Annuler une assignation (soft delete, uniquement si 'à faire')
 *     tags: [Assignments]
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
 *         description: Assignation annulée
 *       400:
 *         description: Impossible d'annuler une assignation terminée ou manquée
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non membre de la colocation
 *       404:
 *         description: Assignation introuvable
 *       500:
 *         description: Erreur serveur
 */
router.delete(
  '/:id',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  deleteAssignment
);

export default router;