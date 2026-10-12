
const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// GET /api/meters
// Retrieve all meters with their associated property details.
router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        m.id,
        m.property_id,
        m.meter_number,
        m.name,
        m.unit,
        m.is_active,
        m.created_at,
        p.name AS property_name,
        p.city,
        p.state
      FROM meters AS m
      JOIN properties AS p
        ON p.id = m.property_id
      ORDER BY m.id ASC
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

// POST /api/meters
// Register a new meter for an existing property.
router.post("/", async (req, res, next) => {
  try {
    const { property_id, meter_number, name, unit } = req.body;

    // Validate required fields.
    if (
      property_id === undefined ||
      property_id === null ||
      String(property_id).trim() === "" ||
      !Number.isSafeInteger(Number(property_id)) ||
      Number(property_id) <= 0 ||
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid property_id and non-empty name are required.",
      });
    }

    // Validate optional meter number.
    if (
      meter_number !== undefined &&
      meter_number !== null &&
      (typeof meter_number !== "string" || !meter_number.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "meter_number must be a non-empty string when provided.",
      });
    }

    // This version supports kWh only.
    if (unit !== undefined && unit !== "kWh") {
      return res.status(400).json({
        success: false,
        message: 'The meter unit must be "kWh".',
      });
    }

    const result = await pool.query(
      `INSERT INTO meters (property_id, meter_number, name, unit)
       VALUES ($1, $2, $3, $4)
       RETURNING
         id,
         property_id,
         meter_number,
         name,
         unit,
         is_active,
         created_at`,
      [
        Number(property_id),
        meter_number == null ? null : meter_number.trim(),
        name.trim(),
        unit || "kWh",
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Meter created successfully",
      data: result.rows[0],
    });
  } catch (err) {
    // PostgreSQL foreign key violation: property does not exist.
    if (err.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "The specified property does not exist.",
      });
    }

    // PostgreSQL unique constraint violation:
    // duplicate meter number for the same property.
    if (err.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "This meter number already exists for the property.",
      });
    }

    next(err);
  }
});

module.exports = router;
