import { Router } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import { checkIdParam } from '../middlewares/checkIdParam';
import { requireColocationMember } from '../middlewares/requireColocationMember';
import { getExpense, updateExpense, deleteExpense } from '../controllers/expenseController';

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

/**
 * @swagger
 * /api/expenses/{id}:
 *   patch:
 *     summary: Modifier une dépense (US-23)
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Courses Carrefour
 *               amount:
 *                 type: integer
 *                 description: "Montant en centimes (ex: 4250 = 42,50 €)"
 *                 example: 5000
 *               category:
 *                 type: string
 *                 example: courses
 *               description:
 *                 type: string
 *                 nullable: true
 *               date:
 *                 type: string
 *                 format: date
 *                 description: "Format YYYY-MM-DD"
 *                 example: "2026-05-29"
 *     responses:
 *       200:
 *         description: Dépense mise à jour avec les parts recalculées si le montant a changé
 *       400:
 *         description: Aucun champ fourni ou valeur invalide
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non payeur et non admin de la colocation
 *       404:
 *         description: Dépense introuvable
 *       500:
 *         description: Erreur serveur
 */
router.patch(
  '/:id',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  updateExpense
);

/**
 * @swagger
 * /api/expenses/{id}:
 *   delete:
 *     summary: Supprimer une dépense (US-23)
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
 *       204:
 *         description: Dépense supprimée (soft delete)
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non payeur et non admin de la colocation
 *       404:
 *         description: Dépense introuvable
 *       500:
 *         description: Erreur serveur
 */
router.delete(
  '/:id',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  deleteExpense
);

export default router;