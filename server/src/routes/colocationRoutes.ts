import { Router } from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import {
  createColocation,
  joinColocation,
  getMyColocation,
  getColocationById,
  getColocationMembers,
  updateColocationInfo,
  regenerateInviteCode,
  removeMember
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
import { 
  createExpense, 
  getExpenses,
  getBalances
} from '../controllers/expenseController';



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

/**
 * @swagger
 * /api/colocations/{id}:
 *   patch:
 *     summary: Modifier le nom et/ou la description de la colocation (admin uniquement)
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: "La coloc des artistes"
 *               description:
 *                 type: string
 *                 example: "Notre belle coloc du 3ème"
 *     responses:
 *       200:
 *         description: Informations mises à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 colocation:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     name: { type: string }
 *                     description: { type: string }
 *                     inviteCode: { type: string }
 *                     autoRotation: { type: boolean }
 *                     updatedAt: { type: string }
 *       400:
 *         description: Body invalide (aucun champ présent ou name vide)
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non admin
 *       404:
 *         description: Colocation introuvable
 *       500:
 *         description: Erreur serveur
 */
router.patch(
  '/:id',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  checkAdminRole,
  updateColocationInfo
);

/**
 * @swagger
 * /api/colocations/{id}/invite-code/regenerate:
 *   post:
 *     summary: Régénérer le code d'invitation de la colocation (admin uniquement)
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
 *         description: Nouveau code généré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 inviteCode:
 *                   type: string
 *                   example: "A1B2C3D4"
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non admin
 *       404:
 *         description: Colocation introuvable
 *       500:
 *         description: Erreur serveur (collision non résoluble après 5 tentatives)
 */
router.post(
  '/:id/invite-code/regenerate',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  checkAdminRole,
  regenerateInviteCode
);

/**
 * @swagger
 * /api/colocations/{id}/expenses:
 *   post:
 *     summary: Créer une dépense partagée (US-19)
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
 *         description: ID de la colocation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - amount
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *                 example: Courses Carrefour
 *               amount:
 *                 type: integer
 *                 description: "Montant en centimes (ex: 4250 = 42,50 €)"
 *                 example: 4250
 *               category:
 *                 type: string
 *                 example: courses
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: Courses de la semaine
 *               date:
 *                 type: string
 *                 format: date
 *                 description: "Format YYYY-MM-DD. Défaut : aujourd'hui"
 *                 example: "2026-05-29"
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                   example: f89e637d-ced4-4ef9-ad6a-2d571aee52d5
 *                 description: "Membres concernés. Défaut : tous les membres actifs"
 *     responses:
 *       201:
 *         description: Dépense créée avec ses parts calculées
 *       400:
 *         description: Champs invalides ou memberIds non membres de la colocation
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non membre de cette colocation
 *       500:
 *         description: Erreur serveur
 */
router.post(
  '/:id/expenses',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  createExpense
);

/**
 * @swagger
 * /api/colocations/{id}/expenses:
 *   get:
 *     summary: Lister les dépenses d'une colocation, avec filtres (US-22)
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
 *         description: ID de la colocation
 *       - in: query
 *         name: from
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: "Date de début de période (YYYY-MM-DD, incluse)"
 *       - in: query
 *         name: to
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: "Date de fin de période (YYYY-MM-DD, incluse)"
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *         description: "Filtre exact sur la catégorie (ex: courses)"
 *     responses:
 *       200:
 *         description: Liste des dépenses filtrées avec leurs parts
 *       400:
 *         description: Format de date invalide
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non membre de la colocation
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/:id/expenses',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  getExpenses
);

/**
 * @swagger
 * /api/colocations/{id}/balances:
 *   get:
 *     summary: Voir les soldes et dettes simplifiées de la colocation (US-21)
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
 *         description: ID de la colocation
 *     responses:
 *       200:
 *         description: Soldes nets par membre et liste des dettes simplifiées
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balances:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                         format: uuid
 *                       username:
 *                         type: string
 *                       avatarUrl:
 *                         type: string
 *                         nullable: true
 *                       net:
 *                         type: integer
 *                         description: "Solde en centimes. Positif = on lui doit. Négatif = il doit."
 *                 debts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       fromUserId:
 *                         type: string
 *                         format: uuid
 *                       fromUsername:
 *                         type: string
 *                       toUserId:
 *                         type: string
 *                         format: uuid
 *                       toUsername:
 *                         type: string
 *                       amount:
 *                         type: integer
 *                         description: Montant de la dette en centimes
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non membre de la colocation
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/:id/balances',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  getBalances
);

/**
 * @swagger
 * /api/colocations/{id}/members/{userId}:
 *   delete:
 *     summary: Retirer un membre de la colocation (admin uniquement)
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
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Membre retiré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Membre retiré de la colocation."
 *       400:
 *         description: Tentative de se retirer soi-même
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non admin
 *       404:
 *         description: Membre introuvable dans cette colocation
 *       500:
 *         description: Erreur serveur
 */
router.delete(
  '/:id/members/:userId',
  authenticateToken,
  checkIdParam,
  requireColocationMember,
  checkAdminRole,
  removeMember
);



export default router;