export const requestLogger = (req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next(); // Indispensable pour passer à la suite !
};
//# sourceMappingURL=logger.js.map