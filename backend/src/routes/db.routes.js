const express = require("express");
const pool = require("../config/db");

const router = express.Router();

router.get("/health", async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, NOW() AS server_time"
    );

    res.status(200).json({
      success: true,
      message: "PostgreSQL connection successful",
      database: result.rows[0].database,
      serverTime: result.rows[0].server_time,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;