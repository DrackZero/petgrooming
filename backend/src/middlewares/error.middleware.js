// Middleware para rutas no encontradas (404).
export const notFound = (req, res, next) => {
  res.status(404).json({ message: `Ruta no encontrada: ${req.originalUrl}` });
};

// Middleware central de manejo de errores.
// Captura cualquier error lanzado en los controladores.
export const errorHandler = (err, req, res, next) => {
  console.error('❌', err.stack || err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
