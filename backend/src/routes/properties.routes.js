const express = require("express");
const pool = require("../config/db");

const router = express.Router();

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

module.exports = router;