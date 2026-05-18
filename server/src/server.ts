import "dotenv/config";
import express from 'express';
import type { Application } from 'express';
import { initDatabase } from './config/database';
import { requestLogger } from './middlewares/logger';
import { errorHandler } from "./middlewares/errorHandler";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import userRoutes from './routes/userRoutes';
import taskRoutes from './routes/taskRoutes';

const startServer = async () => {
    await initDatabase();
    console.log('Connexion à la base de données établie.');

    const app: Application = express();

    app.use(cors({
        origin: 'http://localhost:3000',
        credentials: true
    }));

    app.use(express.json());
    app.use(cookieParser());
    app.use(requestLogger);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // Routes
    app.use('/api/users', userRoutes);
    app.use('/api/tasks', taskRoutes);

    // Toujours en dernier
    app.use(errorHandler);

    const port = 3001;
    app.listen(port, () => {
        console.log(`Serveur lancé sur http://localhost:${port}`);
    });
};

startServer().catch((err) => {
    console.error('Erreur au démarrage du serveur :', err);
    process.exit(1);
});