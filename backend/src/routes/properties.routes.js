const express = require("express");
const pool = require("../config/db");

const router = express.Router();

// GET DATA HANDLER
router.get("/", async (req, res, next) => {
    try{
        const result = await pool.query(
            `SELECT id, name, city, state, created_at FROM properties ORDER BY id ASC`
        );

        res.status(200).json({
            success: true,
            count: result.rowCount,
            data: result.rows,
        });

    } catch (err){
        next(err);
    }
});


// POST DATA HANDLER
router.post("/", async (req, res, next) => {
  try {
    const { name, city, state } = req.body;

    if (
      typeof name !== "string" ||
      typeof city !== "string" ||
      typeof state !== "string" ||
      !name.trim() ||
      !city.trim() ||
      !state.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, city and state are required.",
      });
    }

    const result = await pool.query(
      `INSERT INTO properties (name, city, state)
       VALUES ($1, $2, $3)
       RETURNING id, name, city, state, created_at`,
      [name.trim(), city.trim(), state.trim()]
    );

    return res.status(201).json({
      success: true,
      message: "Property created successfully",
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;