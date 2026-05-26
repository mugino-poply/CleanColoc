import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { checkIdParam } from '../middlewares/checkIdParam';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestion des utilisateurs
 */

/**
 * @swagger
 * /api/users/me:
 *   patch:
 *     summary: Modifier son profil (nom et avatar)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               avatarUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil mis à jour
 *       400:
 *         description: Aucune donnée fournie
 *       401:
 *         description: Non authentifié
 */
router.patch('/me', authenticateToken, UserController.updateProfile);

/**
 * @swagger
 * /api/users/me:
 *   delete:
 *     summary: Supprimer son compte
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       204:
 *         description: Compte supprimé
 *       401:
 *         description: Mot de passe incorrect
 */
router.delete('/me', authenticateToken, UserController.deleteAccount);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Récupérer le profil d'un utilisateur
 *     tags: [Users]
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
 *         description: Profil utilisateur
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id', authenticateToken, checkIdParam, UserController.getProfile);

export default router;