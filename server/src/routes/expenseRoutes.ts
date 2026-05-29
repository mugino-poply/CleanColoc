import { Router } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import { checkIdParam } from '../middlewares/checkIdParam';
import { requireColocationMember } from '../middlewares/requireColocationMember';
import { getExpense } from '../controllers/expenseController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Expenses
 *   description: Gestion des dépenses partagées
 */

/**
 * @swagger
 * /api/expenses/{id}:
 *   get:
 *     summary: Voir le détail d'une dépense (US-20)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la dépense
 *     responses:
 *       200:
 *         description: Détail complet de la dépense avec les parts par membre
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non membre de la colocation associée
 *       404:
 *         description: Dépense introuvable
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/:id',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  getExpense
);

export default router;