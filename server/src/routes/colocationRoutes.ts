import { Router } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import {
  createColocation,
  joinColocation,
  getMyColocation,
  getColocationById
} from '../controllers/colocationController';
import { checkIdParam } from '../middlewares/checkIdParam';
import { requireColocationMember } from '../middlewares/requireColocationMember';
import {
  getColocationTasks,
  createTaskInColocation,
} from '../controllers/taskController';

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

/**
 * @swagger
 * /api/colocations/{id}:
 *   get:
 *     summary: Retourne le détail d'une colocation
 *     tags: [Colocations]
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
 *         description: Détail de la colocation
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès interdit
 *       404:
 *         description: Colocation introuvable
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id', authenticateToken, getColocationById);

/**
 * @swagger
 * /api/colocations/{id}/tasks:
 *   get:
 *     summary: Liste les tâches de la colocation (avec filtres optionnels)
 *     tags: [Colocations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: ['à faire', 'terminée']
 *         description: Filtrer par statut
 *       - in: query
 *         name: assignedTo
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrer par membre assigné
 *     responses:
 *       200:
 *         description: Liste des tâches
 *       400:
 *         description: Filtre invalide
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non membre de la colocation
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/:id/tasks',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  getColocationTasks
);

/**
 * @swagger
 * /api/colocations/{id}/tasks:
 *   post:
 *     summary: Créer une tâche dans la colocation
 *     tags: [Colocations]
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
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 description: Optionnelle, doit être dans le futur si fournie
 *     responses:
 *       201:
 *         description: Tâche créée
 *       400:
 *         description: Champs invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non membre de la colocation
 *       500:
 *         description: Erreur serveur
 */
router.post(
  '/:id/tasks',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  createTaskInColocation
);


export default router;