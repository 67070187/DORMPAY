const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("./middleware/logger");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// Middleware ที่ทำงานกับทุก request (ลำดับมีผล)
app.use(logger);
app.use(express.json()); // แปลง JSON body -> req.body
app.use(cookieParser()); // แปลง Cookie header -> req.cookies

app.use("/api", require("./routes"));

app.use(notFound);
app.use(errorHandler); // ต้องอยู่ท้ายสุด

module.exports = app;
