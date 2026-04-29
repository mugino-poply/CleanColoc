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

// --- AJOUT : Import des routes ---
import userRoutes from './routes/userRoutes';

const startServer = async () => {
    await initDatabase(); 

    console.log('Tous les modèles synchronisés avec la base de données.');

    const app: Application = express(); 

    app.use(cors({
        origin: 'http://localhost:3000', // URL de ton front Next.js
        credentials: true // Important pour autoriser les cookies (Refresh Token)
    }));

    app.use(express.json()); 
    app.use(cookieParser());
    app.use(requestLogger); 

    // --- AJOUT : Utilisation des routes ---
    // Toutes les routes définies dans userRoutes commenceront par /api/users
    app.use('/api/users', userRoutes);

    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec)); 

    // Le errorHandler doit TOUJOURS être après les routes
    app.use(errorHandler); 

    const port = 3001; 

    app.listen(port, () => {
        console.log(`Serveur lancé sur http://localhost:${port}`)
    });
};

startServer().catch((err) => {
  console.error('Erreur au démarrage du serveur :', err);
  process.exit(1);
});