const express = require("express");
const cors = require("cors");
const propertiesRoutes = require("./routes/properties.routes");
const metersRoutes = require("./routes/meters.routes");
const billsRoutes = require("./routes/bills.routes");

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
app.use("/api/meters", metersRoutes);
app.use("/api/bills", billsRoutes);



// These must remain after your routes.
app.use(notFound);
app.use(errorHandler);

module.exports = app;