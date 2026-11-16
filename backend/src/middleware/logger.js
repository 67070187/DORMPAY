/** Middleware: log ทุก request เช่น "GET /api/bills 200 12ms" */
function logger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    if (process.env.NODE_ENV !== "test") {
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    }
  });
  next();
}

module.exports = logger;
