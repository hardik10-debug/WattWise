const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health.routes");
const notFound = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

app.use("/api/health", healthRoutes);

// Keep these after all registered routes.
app.use(notFound);
app.use(errorHandler);

module.exports = app;