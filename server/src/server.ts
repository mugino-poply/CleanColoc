import "dotenv/config";
import express from 'express';
import type {Application} from 'express';
import { initDatabase } from './config/database';
import { requestLogger } from './middlewares/logger'
import { errorHandler } from "./middlewares/errorHandler";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import cors from 'cors';


const startServer = async () => {
    await initDatabase(); // On vérifie la connexion avec la DB

    console.log('Tous les modèles synchronisés avec la base de données.');

    const app: Application = express(); // Config express

    app.use(cors());

    app.use(express.json()); // important: middleware qui parse le json automatiquement

    app.use(requestLogger); // middleware logger

    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec)); // swagger

    app.use(errorHandler); // Gestion d'erreurs

    const port = 3000; // Config port

    app.listen(port, () => {
        console.log(`Serveur lancé sur http://localhost:${port}`)
    });
};

startServer().catch((err) => {
  console.error('Erreur au démarrage du serveur :', err);
  process.exit(1);
});