import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { checkIdParam } from '../middlewares/checkIdParam';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @swagger
 * /api/users/register:
 * post:
 * summary: Inscription d'un nouvel utilisateur
 * tags: [Users]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * prenom_user: {type: string}
 * nom_user: {type: string}
 * mail_user: {type: string}
 * password_user: {type: string}
 */
router.post('/register', UserController.register);

/**
 * @swagger
 * /api/users/login:
 * post:
 * summary: Connexion utilisateur
 * tags: [Users]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * mail_user: {type: string}
 * password_user: {type: string}
 */
router.post('/login', UserController.login);

/**
 * @swagger
 * /api/users/logout:
 * post:
 * summary: Déconnexion (supprime le cookie)
 * tags: [Users]
 * security:
 * - bearerAuth: []
 */
router.post('/logout', authenticateToken, UserController.logout);

/**
 * @swagger
 * /api/users/{id}:
 * get:
 * summary: Récupérer le profil d'un utilisateur
 * tags: [Users]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 */
router.get('/:id', authenticateToken, checkIdParam, UserController.getProfile);

export default router;