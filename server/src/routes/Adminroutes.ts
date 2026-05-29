import { Router } from 'express';
import { isAdmin } from '../middlewares/Isadmin';
import { authenticateToken } from '../middlewares/authMiddleware';
import {
  getStats,
  listUsers,
  deleteUser,
  listColocations,
  deleteColocation,
  listTasks,
  listAssignments,
} from '../controllers/Admincontroller';

const router = Router();

// Toutes les routes admin nécessitent un JWT valide + email dans ADMIN_EMAILS
router.use(authenticateToken, isAdmin);

router.get('/stats',              getStats);
router.get('/users',              listUsers);
router.delete('/users/:id',       deleteUser);
router.get('/colocations',        listColocations);
router.delete('/colocations/:id', deleteColocation);
router.get('/tasks',              listTasks);
router.get('/assignments',        listAssignments);

export default router;