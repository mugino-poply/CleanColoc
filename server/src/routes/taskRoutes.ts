import { Router } from 'express';
import { checkIdParam } from '../middlewares/checkIdParam';
import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  assignTask,
  completeTask,
  deleteTask,
} from '../controllers/taskController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Gestion des tâches ménagères
 */

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Récupérer toutes les tâches
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: colocId
 *         schema:
 *           type: integer
 *         description: Filtrer par colocation
 *     responses:
 *       200:
 *         description: Liste des tâches
 *       500:
 *         description: Erreur serveur
 */
router.get('/', getAllTasks);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Récupérer une tâche par son ID
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: La tâche
 *       404:
 *         description: Tâche introuvable
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id', checkIdParam, getTaskById);

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Créer une nouvelle tâche
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - colocId
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               colocId:
 *                 type: integer
 *               assignedTo:
 *                 type: integer
 *               isRecurring:
 *                 type: boolean
 *               recurringInterval:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Tâche créée
 *       400:
 *         description: Champs obligatoires manquants
 *       500:
 *         description: Erreur serveur
 */
router.post('/', createTask);

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Modifier une tâche
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, done]
 *               assignedTo:
 *                 type: integer
 *               isRecurring:
 *                 type: boolean
 *               recurringInterval:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Tâche mise à jour
 *       404:
 *         description: Tâche introuvable
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id', checkIdParam, updateTask);

/**
 * @swagger
 * /api/tasks/{id}/assign:
 *   patch:
 *     summary: Assigner une tâche à un membre
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignedTo
 *             properties:
 *               assignedTo:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Tâche assignée
 *       400:
 *         description: Champ assignedTo manquant
 *       404:
 *         description: Tâche introuvable
 *       500:
 *         description: Erreur serveur
 */
router.patch('/:id/assign', checkIdParam, assignTask);

/**
 * @swagger
 * /api/tasks/{id}/complete:
 *   patch:
 *     summary: Marquer une tâche comme terminée
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tâche marquée comme terminée
 *       404:
 *         description: Tâche introuvable
 *       500:
 *         description: Erreur serveur
 */
router.patch('/:id/complete', checkIdParam, completeTask);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Supprimer une tâche
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Tâche supprimée
 *       404:
 *         description: Tâche introuvable
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id', checkIdParam, deleteTask);

export default router;