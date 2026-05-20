import { Router } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import {
  createColocation,
  joinColocation,
  getMyColocation,
} from '../controllers/colocationController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Colocations
 *   description: Gestion des colocations
 */

/**
 * @swagger
 * /api/colocations:
 *   post:
 *     summary: Créer une nouvelle colocation
 *     tags: [Colocations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Colocation créée
 *       400:
 *         description: Nom manquant
 *       500:
 *         description: Erreur serveur
 */
router.post('/', authenticateToken, createColocation);

/**
 * @swagger
 * /api/colocations/join:
 *   post:
 *     summary: Rejoindre une colocation avec un code d'invitation
 *     tags: [Colocations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inviteCode
 *             properties:
 *               inviteCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Colocation rejointe
 *       404:
 *         description: Code invalide
 *       409:
 *         description: Utilisateur déjà membre d'une colocation
 *       500:
 *         description: Erreur serveur
 */
router.post('/join', authenticateToken, joinColocation);

/**
 * @swagger
 * /api/colocations/me:
 *   get:
 *     summary: Retourne la colocation de l'utilisateur connecté
 *     tags: [Colocations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Colocation et rôle de l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 colocation:
 *                   type: object
 *                 role:
 *                   type: string
 *                   enum: [admin, member]
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: L'utilisateur n'appartient à aucune colocation
 *       500:
 *         description: Erreur serveur
 */
router.get('/me', authenticateToken, getMyColocation);

export default router;