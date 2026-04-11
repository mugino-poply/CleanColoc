export const checkIdParam = (req, res, next) => {
    const id = req.params.id;
    // Vérifie si l'ID existe
    if (!id) {
        return res.status(400).json({
            error: 'ID utilisateur manquant'
        });
    }
    // Vérifie le type d'ID
    if (typeof id !== 'string') {
        return res.status(400).json({
            error: 'ID utilisateur non valide'
        });
    }
    // Vérifie si c'est un nombre entier valide
    if (!/^\d+$/.test(id)) {
        return res.status(400).json({
            error: 'ID utilisateur invalide (doit être un nombre)'
        });
    }
    // Passe à la route suivante
    next();
};
//# sourceMappingURL=checkIdParam.js.map