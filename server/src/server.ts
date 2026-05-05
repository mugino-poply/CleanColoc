import "dotenv/config";
import express from 'express';
import type { Application } from 'express';
import { initDatabase } from './config/database';
import { requestLogger } from './middlewares/logger';
import { errorHandler } from './middlewares/errorHandler';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import cors from 'cors';
import taskRoutes from './routes/taskRoutes';

const startServer = async () => {
  await initDatabase();
  console.log('Connexion à la base de données établie.');

  const app: Application = express();

  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Routes
  app.use('/api/tasks', taskRoutes);

  // Toujours en dernier
  app.use(errorHandler);

  const port = 3000;
  app.listen(port, () => {
    console.log(`Serveur lancé sur http://localhost:${port}`);
  });
};

startServer().catch((err) => {
  console.error('Erreur au démarrage du serveur :', err);
  process.exit(1);
});