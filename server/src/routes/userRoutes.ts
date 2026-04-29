import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { checkIdParam } from '../middlewares/checkIdParam';

const router = Router();

/**
 * @swagger
 * /api/users/register:
 * post:
 * summary: Inscription d'un nouvel utilisateur
 * tags: [Users]
 */
router.post('/register', UserController.register);

/**
 * @swagger
 * /api/users/login:
 * post:
 * summary: Connexion utilisateur
 * tags: [Users]
 */
router.post('/login', UserController.login);

/**
 * @swagger
 * /api/users/logout:
 * post:
 * summary: Déconnexion (supprime le cookie)
 * tags: [Users]
 */
router.post('/logout', UserController.logout);

/**
 * @swagger
 * /api/users/{id}:
 * get:
 * summary: Récupérer le profil d'un utilisateur
 * tags: [Users]
 */
router.get('/:id', checkIdParam, UserController.getProfile);

export default router;