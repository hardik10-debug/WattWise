
const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// GET /api/bills
// Retrieve bills with their associated meter and property details.
router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        b.id,
        b.meter_id,
        b.billing_start_date,
        b.billing_end_date,
        b.units_consumed,
        b.bill_amount,
        b.opening_reading_kwh,
        b.closing_reading_kwh,
        b.reading_type,
        b.created_at,
        m.meter_number,
        m.name AS meter_name,
        p.id AS property_id,
        p.name AS property_name,
        p.city,
        p.state
      FROM bills AS b
      JOIN meters AS m
        ON m.id = b.meter_id
      JOIN properties AS p
        ON p.id = m.property_id
      ORDER BY b.billing_end_date DESC, b.id DESC
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
      billing_start_date,
      billing_end_date,
      units_consumed,
      bill_amount,
      opening_reading_kwh,
      closing_reading_kwh,
      reading_type = "actual",
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

    // Validate date format (YYYY-MM-DD).
    const validDate = (value) => {
      if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
      ) {
        return false;
      }

      const date = new Date(`${value}T00:00:00.000Z`);

      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    };

    if (
      !validDate(billing_start_date) ||
      !validDate(billing_end_date)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid billing_start_date and billing_end_date are required in YYYY-MM-DD format.",
      });
    }

    if (billing_end_date < billing_start_date) {
      return res.status(400).json({
        success: false,
        message: "billing_end_date cannot be before billing_start_date.",
      });
    }

    // Validate units and amount.
    const validNonNegativeNumber = (value) =>
      value !== null &&
      value !== undefined &&
      value !== "" &&
      Number.isFinite(Number(value)) &&
      Number(value) >= 0;

    if (
      !validNonNegativeNumber(units_consumed) ||
      !validNonNegativeNumber(bill_amount)
    ) {
      return res.status(400).json({
        success: false,
        message: "units_consumed and bill_amount must be non-negative numbers.",
      });
    }

    // Validate optional meter readings.
    for (const [field, value] of [
      ["opening_reading_kwh", opening_reading_kwh],
      ["closing_reading_kwh", closing_reading_kwh],
    ]) {
      if (
        value !== undefined &&
        value !== null &&
        !validNonNegativeNumber(value)
      ) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a non-negative number or null.`,
        });
      }
    }

    if (
      opening_reading_kwh != null &&
      closing_reading_kwh != null &&
      Number(closing_reading_kwh) < Number(opening_reading_kwh)
    ) {
      return res.status(400).json({
        success: false,
        message: "closing_reading_kwh cannot be less than opening_reading_kwh.",
      });
    }

    if (!["actual", "estimated"].includes(reading_type)) {
      return res.status(400).json({
        success: false,
        message: 'reading_type must be "actual" or "estimated".',
      });
    }

    const result = await pool.query(
      `INSERT INTO bills (
        meter_id,
        billing_start_date,
        billing_end_date,
        units_consumed,
        bill_amount,
        opening_reading_kwh,
        closing_reading_kwh,
        reading_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        Number(meter_id),
        billing_start_date,
        billing_end_date,
        units_consumed,
        bill_amount,
        opening_reading_kwh ?? null,
        closing_reading_kwh ?? null,
        reading_type,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Bill created successfully",
      data: result.rows[0],
    });
  } catch (err) {
    // Meter does not exist.
    if (err.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "The specified meter does not exist.",
      });
    }

    // Billing period overlaps an existing bill for this meter.
    if (err.code === "23P01") {
      return res.status(409).json({
        success: false,
        message: "This billing period overlaps an existing bill for the meter.",
      });
    }

    next(err);
  }
});

module.exports = router;
