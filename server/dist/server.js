import express from 'express';
import userRoutes from './routes/userRoutes';
import sequelize from './config/database';
import { initDatabase } from './config/database';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { requestLogger } from './middlewares/logger';
import { errorHandler } from "./middlewares/errorHandler";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import cors from 'cors';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const startServer = async () => {
    await initDatabase(); // On vérifie la connexion avec la DB
    await sequelize.sync({ alter: true }); // On synchronise les modèles
    console.log('Tous les modèles synchronisés avec la base de données.');
    const app = express(); // Config express
    app.use(cors());
    app.use(express.static(path.join(__dirname, '../public'))); // middleware qui permet d'utiliser un dossier statique
    app.use(express.json()); // important: middleware qui parse le json automatiquement
    app.use(requestLogger); // middleware logger
    app.use('/', userRoutes); // on monte à la racine
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec)); // swagger
    app.use(errorHandler); // Gestion d'erreurs
    const port = 3000; // Config port
    app.listen(port, () => {
        console.log(`Serveur lancé sur http://localhost:${port}`);
    });
};
startServer().catch((err) => {
    console.error('Erreur au démarrage du serveur :', err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map