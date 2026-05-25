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
import colocationRoutes from './routes/colocationRoutes';
import authRoutes from './routes/authRoutes'

const startServer = async () => {
    await initDatabase();
    console.log('Connexion à la base de données établie.');

    const app: Application = express();

    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'https://cleancoloc.ddns.net',
    ];

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS bloqué pour l'origine : ${origin}`));
            }
        },
        credentials: true,
    }));

    app.use(express.json());
    app.use(cookieParser());
    app.use(requestLogger);

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/tasks', taskRoutes);
    app.use('/api/colocations', colocationRoutes);

    // Toujours en dernier
    app.use(errorHandler);

    const port = parseInt(process.env['PORT'] ?? '3001', 10);
    app.listen(port, () => {
        console.log(`Serveur lancé sur http://localhost:${port}`);
    });
};

startServer().catch((err) => {
    console.error('Erreur au démarrage du serveur :', err);
    process.exit(1);
});