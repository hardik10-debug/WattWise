
const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// GET /api/readings
// Retrieve readings with their meter and property details.
router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id,
        r.meter_id,
        r.reading_value_kwh,
        r.recorded_at,
        r.source,
        r.note,
        r.created_at,
        m.meter_number,
        m.name AS meter_name,
        p.id AS property_id,
        p.name AS property_name,
        p.city,
        p.state
      FROM meter_readings AS r
      JOIN meters AS m
        ON m.id = r.meter_id
      JOIN properties AS p
        ON p.id = m.property_id
      ORDER BY r.recorded_at DESC, r.id DESC
    `);

    return res.status(200).json({
      success: true,
      count: result.rowCount,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
});


router.post("/", async (req, res, next) => {
  try {
    const {
      meter_id,
      reading_value_kwh,
      recorded_at,
      source = "manual",
      note = null,
    } = req.body;

    // Validate meter ID.
    if (
      meter_id === undefined ||
      meter_id === null ||
      String(meter_id).trim() === "" ||
      !Number.isSafeInteger(Number(meter_id)) ||
      Number(meter_id) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid meter_id is required.",
      });
    }

    // Validate the cumulative reading.
    if (
      reading_value_kwh === undefined ||
      reading_value_kwh === null ||
      reading_value_kwh === "" ||
      !Number.isFinite(Number(reading_value_kwh)) ||
      Number(reading_value_kwh) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "reading_value_kwh must be a non-negative number.",
      });
    }

    // Validate timestamp.
    if (
      typeof recorded_at !== "string" ||
      recorded_at.trim() === "" ||
      Number.isNaN(Date.parse(recorded_at))
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid recorded_at timestamp is required.",
      });
    }

    // Validate reading source.
    if (!["manual", "photo", "import"].includes(source)) {
      return res.status(400).json({
        success: false,
        message: 'source must be "manual", "photo", or "import".',
      });
    }

    // Validate optional note.
    if (note !== null && typeof note !== "string") {
      return res.status(400).json({
        success: false,
        message: "note must be a string or null.",
      });
    }

    const result = await pool.query(
      `INSERT INTO meter_readings (
        meter_id,
        reading_value_kwh,
        recorded_at,
        source,
        note
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        Number(meter_id),
        reading_value_kwh,
        recorded_at,
        source,
        note,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Meter reading created successfully",
      data: result.rows[0],
    });
  } catch (err) {
    if (err.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "The specified meter does not exist.",
      });
    }

    next(err);
  }
});

module.exports = router;
