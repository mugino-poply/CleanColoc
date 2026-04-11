import swaggerJsdoc from "swagger-jsdoc";

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "CleanColoc API",
            version: "1.0.0",
            description: "API de gestion de colocation — tâches, dépenses et membres",
        },
    },
    // Chemin vers les fichiers contenant les annotations
    apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);