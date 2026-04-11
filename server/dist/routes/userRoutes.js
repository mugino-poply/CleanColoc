import express, { Router } from 'express';
import * as userController from '../controllers/userController';
import { checkIdParam } from '../middlewares/checkIdParam';
const router = Router();
/**
 * @openapi
 * /:
 *   get:
 *     summary: Message de bienvenue
 *     tags: [Home]
 *     responses:
 *       200:
 *         description: Message de bienvenue envoyé
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Bienvenue sur mon serveur API"
 */
router.get('/', userController.welcome);
/**
 * @openapi
 * /api/hello/{name}:
 *   get:
 *     summary: Salutation personnalisée avec timestamp
 *     tags: [Hello]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nom de la personne à saluer
 *     responses:
 *       200:
 *         description: Salutation avec timestamp
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Bonjour John"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2026-02-21T16:45:00.000Z"
 */
router.get('/api/hello/:name', userController.hello);
/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Récupère la liste des utilisateurs (triés par nom)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Liste des utilisateurs récupérée
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   nom:
 *                     type: string
 *                   email:
 *                     type: string
 *       500:
 *         description: Erreur serveur
 */
router.get('/api/users', userController.getAllUsers);
/**
 * @openapi
 * /api/data:
 *   get:
 *     summary: Récupère les statistiques globales et les 3 derniers utilisateurs créés
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Statistiques et liste des derniers utilisateurs récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statistiques:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 42
 *                       description: Nombre total d'utilisateurs
 *                     moyenneLongueurNom:
 *                       type: integer
 *                       example: 6
 *                       description: Longueur moyenne des noms des trois derniers utilisateurs
 *                     derniers3:
 *                       type: integer
 *                       example: 3
 *                       description: Nombre d'utilisateurs considérés pour les statistiques
 *                 derniersAjouts:
 *                   type: array
 *                   description: Liste des trois derniers utilisateurs ajoutés
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 5
 *                       nom:
 *                         type: string
 *                         example: "Dupont"
 *                       prenom:
 *                         type: string
 *                         example: "Jean"
 *                       creeLe:
 *                         type: string
 *                         format: date
 *                         example: "2026-02-25"
 *       500:
 *         description: Erreur lors du calcul des statistiques
 */
router.get('api/data', userController.getData);
/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     summary: Récupère les informations d’un utilisateur par son identifiant
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Identifiant de l’utilisateur à récupérer
 *     responses:
 *       200:
 *         description: Données de l’utilisateur récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 nom:
 *                   type: string
 *                 prenom:
 *                   type: string
 *                 email:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('api/users/:id', userController.getUser);
/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Crée un nouvel utilisateur
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *                 example: "Dupont"
 *               email:
 *                 type: string
 *                 example: "dupont@email.com"
 *             required: [nom, email]
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 nom:
 *                   type: string
 *                 email:
 *                   type: string
 *       400:
 *         description: Données invalides
 */
router.post('/api/users', userController.createUser);
/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     summary: Supprime un utilisateur par ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur à supprimer
 *     responses:
 *       200:
 *         description: Utilisateur supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Utilisateur supprimé"
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete('/api/users/:id', checkIdParam, userController.deleteUser);
export default router;
//# sourceMappingURL=userRoutes.js.map