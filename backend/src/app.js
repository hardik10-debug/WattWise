const express = require("express");
const cors = require("cors");
const propertiesRoutes = require("./routes/properties.routes");

const healthRoutes = require("./routes/health.routes");
const dbRoutes = require("./routes/db.routes");

const notFound = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
}));

app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/db", dbRoutes);
app.use("/api/properties", propertiesRoutes);

// These must remain after your routes.
app.use(notFound);
app.use(errorHandler);

module.exports = app;