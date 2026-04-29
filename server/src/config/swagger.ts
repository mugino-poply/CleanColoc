import swaggerJsdoc from "swagger-jsdoc";
import path from "path";

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "CleanColoc API",
            version: "1.0.0",
            description: "API de gestion de colocation — tâches, dépenses et membres",
        },
        servers: [
            {
                url: "http://localhost:3001",
                description: "Serveur local de développement",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
    },
    /**
     * On liste tous les chemins possibles pour être sûr que Swagger trouve tes annotations.
     * process.cwd() part de la racine de ton projet (là où il y a le package.json).
     */
    apis: [
        path.resolve(process.cwd(), "./src/routes/*.ts"),
        path.resolve(process.cwd(), "./routes/*.ts"),
        path.resolve(process.cwd(), "./dist/routes/*.js"), 
    ],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);