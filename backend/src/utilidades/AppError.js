// ================================================================
// UTILIDADES - Error controlado de la aplicación
// ================================================================
class AppError extends Error {
    constructor(mensaje, statusCode) {
        super(mensaje);
        this.statusCode = statusCode;
        this.isOperational = true; // error esperado (validación, auth, etc.)
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
