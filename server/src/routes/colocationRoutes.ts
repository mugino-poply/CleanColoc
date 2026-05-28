import { Router } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import {
  createColocation,
  joinColocation,
  getMyColocation,
  getColocationById,
  getColocationMembers
} from '../controllers/colocationController';
import { checkIdParam } from '../middlewares/checkIdParam';
import { requireColocationMember } from '../middlewares/requireColocationMember';
import { checkAdminRole } from '../middlewares/checkAdminRole';
import {
  getColocationAssignments,
  getAssignmentStats,
  regenerateAssignments,
} from '../controllers/assignmentController';
import { createTaskInColocation } from '../controllers/taskController';
import { 
  updateColocationSettings,
  transferAdmin } from '../controllers/colocationController';


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
 * /api/colocations/{id}/assignments/stats:
 *   get:
 *     summary: Statistiques d'assignation - matrice membre x tâche
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
 *         description: UUID de la colocation
 *       - in: query
 *         name: from
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Début de période (ISO 8601, ex. 2026-05-01). Absent = depuis le début.
 *       - in: query
 *         name: to
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Fin de période (ISO 8601, ex. 2026-05-31). La journée entière est incluse.
 *     responses:
 *       200:
 *         description: Matrice plate + totaux membres + totaux tâches + indicateurs de charge
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     from: { type: string, nullable: true }
 *                     to:   { type: string, nullable: true }
 *                 matrix:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:    { type: string }
 *                       taskId:    { type: string }
 *                       taskTitle: { type: string }
 *                       username:  { type: string }
 *                       avatarUrl: { type: string, nullable: true }
 *                       total:     { type: integer }
 *                       completed: { type: integer }
 *                       pending:   { type: integer }
 *                 memberTotals:
 *                   type: array
 *                   items:
 *                     type: object
 *                 taskTotals:
 *                   type: array
 *                   items:
 *                     type: object
 *                 mostLoaded:  { type: object, nullable: true }
 *                 leastLoaded: { type: object, nullable: true }
 *       400:
 *         description: Paramètre de date invalide
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non membre de la colocation
 *       404:
 *         description: Colocation introuvable
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/:id/assignments/stats',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  getAssignmentStats
);


/**
 * @swagger
 * /api/colocations/{id}/assignments:
 *   get:
 *     summary: Liste les assignations de la colocation (avec filtres optionnels)
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
 *         schema:
 *           type: string
 *           enum: ['à faire', 'terminée', 'manquée']
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           description: UUID d'un membre ou 'me'
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [current, next, past, all]
 *           default: current
 *     responses:
 *       200:
 *         description: Liste des assignations
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
  '/:id/assignments',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  getColocationAssignments
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

/**
 * @swagger
 * /api/colocations/{id}/members:
 *   get:
 *     summary: Liste les membres d'une colocation
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
 *         description: UUID de la colocation
 *     responses:
 *       200:
 *         description: Liste des membres
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   membershipId:
 *                     type: string
 *                     format: uuid
 *                   userId:
 *                     type: string
 *                     format: uuid
 *                   username:
 *                     type: string
 *                   avatarUrl:
 *                     type: string
 *                     nullable: true
 *                   role:
 *                     type: string
 *                     enum: [admin, member]
 *                   joinedAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non membre de la colocation
 *       404:
 *         description: Colocation introuvable
 */
router.get(
  '/:id/members',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  getColocationMembers
);

/**
 * @swagger
 * /api/colocations/{id}/settings:
 *   patch:
 *     summary: Modifier les paramètres d'une colocation
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
 *         description: ID de la colocation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - autoRotation
 *             properties:
 *               autoRotation:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Paramètres mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 autoRotation:
 *                   type: boolean
 *       400:
 *         description: autoRotation manquant ou invalide
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non membre de la colocation
 *       404:
 *         description: Colocation introuvable
 */
router.patch('/:id/settings', authenticateToken, checkIdParam, requireColocationMember, updateColocationSettings);


/**
 * @swagger
 * /api/colocations/{id}/assignments/regenerate:
 *   post:
 *     summary: Régénère manuellement les assignations pour la période courante ou suivante
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
 *             required: [period]
 *             properties:
 *               period:
 *                 type: string
 *                 enum: [current, next]
 *     responses:
 *       200:
 *         description: Assignations régénérées
 *       400:
 *         description: Valeur de period invalide
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non membre de la colocation
 *       404:
 *         description: Colocation introuvable
 *       500:
 *         description: Erreur serveur
 */
router.post(
  '/:id/assignments/regenerate',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  regenerateAssignments
);

/**
 * @swagger
 * /api/colocations/{id}/admin/transfer:
 *   patch:
 *     summary: Transférer le rôle admin à un autre membre
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
 *         description: UUID de la colocation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toUserId
 *             properties:
 *               toUserId:
 *                 type: string
 *                 format: uuid
 *                 description: UUID du membre qui deviendra admin
 *     responses:
 *       200:
 *         description: Rôle admin transféré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 membership:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [admin]
 *                     colocationId:
 *                       type: string
 *       400:
 *         description: toUserId manquant, non membre, ou déjà admin
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Appelant non admin
 *       404:
 *         description: Colocation introuvable
 *       500:
 *         description: Erreur serveur
 */
router.patch(
  '/:id/admin/transfer',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  checkAdminRole,
  transferAdmin
);


export default router;