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
import assignmentRoutes from './routes/assignmentRoutes';
import { startScheduler } from "./services/schedulerService";
import expenseRoutes from './routes/expenseRoutes';



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
    app.use('/api/assignments', assignmentRoutes);
    app.use('/api/colocations', colocationRoutes);
    app.use('/api/expenses', expenseRoutes);
    
    // Toujours en dernier
    app.use(errorHandler);

    const port = parseInt(process.env['PORT'] ?? '3001', 10);
    app.listen(port, () => {
        console.log(`Serveur lancé sur http://localhost:${port}`);
        console.log("Gaspard et Hypolite a votre service !!");
        startScheduler();
    });
};

startServer().catch((err) => {
    console.error('Erreur au démarrage du serveur :', err);
    process.exit(1);
});