const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const { calculateConsumption } = require("../../../analytics/consumption");

const LONG_GAP_THRESHOLD_DAYS = 45;
const RECONCILIATION_TOLERANCE_KWH = 1;
const TIME_ZONE = "Asia/Kolkata";

// GET /api/analytics/consumption?meter_id=1
router.get("/consumption", async (req, res, next) => {
  try {
    const meterId = Number(req.query.meter_id);

    if (!Number.isSafeInteger(meterId) || meterId <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid positive meter_id is required.",
      });
    }

    const result = await pool.query(
      `SELECT id, meter_id, reading_value_kwh, recorded_at
       FROM meter_readings
       WHERE meter_id = $1
       ORDER BY recorded_at ASC, id ASC`,
      [meterId]
    );

    const readings = result.rows;
    const intervals = [];

    for (let i = 1; i < readings.length; i++) {
      const earlier = readings[i - 1];
      const later = readings[i];

      const calculation = calculateConsumption(
        earlier.reading_value_kwh,
        later.reading_value_kwh
      );

      const elapsedMs =
        new Date(later.recorded_at).getTime() -
        new Date(earlier.recorded_at).getTime();

      const daysBetweenReadings =
        elapsedMs / (1000 * 60 * 60 * 24);

      const zeroDuration =
        !Number.isFinite(elapsedMs) || elapsedMs <= 0;

      const gapWarning =
        Number.isFinite(daysBetweenReadings) &&
        daysBetweenReadings > LONG_GAP_THRESHOLD_DAYS;

      const averageDailyConsumption =
        calculation.success &&
        !zeroDuration &&
        daysBetweenReadings > 0
          ? Number(
              (
                calculation.consumption /
                daysBetweenReadings
              ).toFixed(3)
            )
          : null;

      let dataQuality = "normal_interval";

      if (zeroDuration) {
        dataQuality = "zero_duration";
      } else if (!calculation.success) {
        dataQuality = "review_required";
      } else if (gapWarning) {
        dataQuality = "long_gap";
      }

      intervals.push({
        earlier_reading: {
          id: earlier.id,
          value_kwh: earlier.reading_value_kwh,
          recorded_at: earlier.recorded_at,
        },
        later_reading: {
          id: later.id,
          value_kwh: later.reading_value_kwh,
          recorded_at: later.recorded_at,
        },
        ...calculation,
        days_between_readings: Number.isFinite(
          daysBetweenReadings
        )
          ? Number(daysBetweenReadings.toFixed(2))
          : null,
        average_daily_consumption_kwh:
          averageDailyConsumption,
        gap_warning: gapWarning,
        zero_duration_warning: zeroDuration,
        data_quality: dataQuality,
      });
    }

    return res.status(200).json({
      success: true,
      meter_id: meterId,
      readings_count: readings.length,
      intervals_count: intervals.length,
      message:
        readings.length < 2
          ? "At least two readings are needed to calculate consumption."
          : "Consumption analysis completed.",
      data: intervals,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/reconciliation?meter_id=1
router.get("/reconciliation", async (req, res, next) => {
  try {
    const meterId = Number(req.query.meter_id);

    if (!Number.isSafeInteger(meterId) || meterId <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid positive meter_id is required.",
      });
    }

    const billsResult = await pool.query(
      `SELECT
         id,
         meter_id,
         TO_CHAR(billing_start_date, 'YYYY-MM-DD')
           AS billing_start_date,
         TO_CHAR(billing_end_date, 'YYYY-MM-DD')
           AS billing_end_date,
         units_consumed,
         bill_amount,
         reading_type
       FROM bills
       WHERE meter_id = $1
       ORDER BY billing_start_date ASC, id ASC`,
      [meterId]
    );

    const reconciliations = [];

    for (const bill of billsResult.rows) {
      const startDate = String(
        bill.billing_start_date
      ).slice(0, 10);

      const endDate = String(
        bill.billing_end_date
      ).slice(0, 10);

      const readingsResult = await pool.query(
        `SELECT id, reading_value_kwh, recorded_at
         FROM meter_readings
         WHERE meter_id = $1
           AND (
             timezone($4, recorded_at)::date = $2::date
             OR timezone($4, recorded_at)::date = $3::date
           )
         ORDER BY recorded_at ASC, id ASC`,
        [
          meterId,
          startDate,
          endDate,
          TIME_ZONE,
        ]
      );

      const readings = readingsResult.rows;

      const openingCandidates = readings.filter(
        (reading) =>
          localDate(reading.recorded_at) === startDate
      );

      const closingCandidates = readings.filter(
        (reading) =>
          localDate(reading.recorded_at) === endDate
      );

      const duplicateBoundaryReadings =
        openingCandidates.length > 1 ||
        closingCandidates.length > 1;

      const openingReading =
        openingCandidates.length === 1
          ? openingCandidates[0]
          : null;

      const closingReading =
        closingCandidates.length === 1
          ? closingCandidates[0]
          : null;

      const billUnits = Number(bill.units_consumed);

      const reconciliation = {
        bill_id: bill.id,
        meter_id: bill.meter_id,
        billing_start_date: startDate,
        billing_end_date: endDate,
        reading_type: bill.reading_type,
        bill_units_kwh: billUnits,
        bill_amount: Number(bill.bill_amount),
        calculated_units_kwh: null,
        difference_kwh: null,
        status: null,
        message: null,

        opening_reading: openingReading
          ? {
              id: openingReading.id,
              value_kwh: openingReading.reading_value_kwh,
              recorded_at: openingReading.recorded_at,
            }
          : null,

        closing_reading: closingReading
          ? {
              id: closingReading.id,
              value_kwh: closingReading.reading_value_kwh,
              recorded_at: closingReading.recorded_at,
            }
          : null,
      };

      // Estimated bills need manual verification.
      if (bill.reading_type === "estimated") {
        reconciliation.status = "review_required";
        reconciliation.message =
          "This bill is estimated. Verify it before confirming reconciliation.";

        reconciliations.push(reconciliation);
        continue;
      }

      // Do not choose arbitrarily between duplicate readings.
      if (duplicateBoundaryReadings) {
        reconciliation.status = "review_required";
        reconciliation.message =
          "Multiple readings exist on a billing boundary date. Review the readings before reconciliation.";

        reconciliation.opening_reading_candidates =
          openingCandidates.length;

        reconciliation.closing_reading_candidates =
          closingCandidates.length;

        reconciliations.push(reconciliation);
        continue;
      }

      // Both boundary readings are required.
      if (!openingReading || !closingReading) {
        reconciliation.status = "insufficient_data";
        reconciliation.message =
          "Readings matching both billing boundary dates are required.";

        reconciliations.push(reconciliation);
        continue;
      }

      const openingTime = new Date(
        openingReading.recorded_at
      ).getTime();

      const closingTime = new Date(
        closingReading.recorded_at
      ).getTime();

      if (
        !Number.isFinite(openingTime) ||
        !Number.isFinite(closingTime) ||
        closingTime <= openingTime
      ) {
        reconciliation.status = "review_required";
        reconciliation.message =
          "The boundary readings have an invalid or zero-duration interval.";

        reconciliations.push(reconciliation);
        continue;
      }

      const elapsedDays =
        (closingTime - openingTime) /
        (1000 * 60 * 60 * 24);

      if (elapsedDays > LONG_GAP_THRESHOLD_DAYS) {
        reconciliation.status = "review_required";
        reconciliation.message =
          "The readings are too far apart for automatic reconciliation.";

        reconciliations.push(reconciliation);
        continue;
      }

      const calculation = calculateConsumption(
        openingReading.reading_value_kwh,
        closingReading.reading_value_kwh
      );

      if (!calculation.success) {
        reconciliation.status = "review_required";
        reconciliation.message = calculation.message;

        reconciliations.push(reconciliation);
        continue;
      }

      const calculatedUnits = calculation.consumption;

      const difference = Number(
        (calculatedUnits - billUnits).toFixed(3)
      );

      reconciliation.calculated_units_kwh =
        calculatedUnits;

      reconciliation.difference_kwh = difference;

      if (
        Math.abs(difference) <=
        RECONCILIATION_TOLERANCE_KWH
      ) {
        reconciliation.status = "matched";
        reconciliation.message =
          "Bill units and meter-calculated units are within the configured tolerance.";
      } else {
        reconciliation.status = "discrepancy";
        reconciliation.message =
          "Bill units differ from meter-calculated units. Review the billing period and readings.";
      }

      reconciliations.push(reconciliation);
    }

    const summary = {
      total_bills: reconciliations.length,
      matched: 0,
      discrepancies: 0,
      insufficient_data: 0,
      review_required: 0,
    };

    for (const item of reconciliations) {
      if (item.status === "matched") {
        summary.matched++;
      } else if (item.status === "discrepancy") {
        summary.discrepancies++;
      } else if (item.status === "insufficient_data") {
        summary.insufficient_data++;
      } else if (item.status === "review_required") {
        summary.review_required++;
      }
    }

    return res.status(200).json({
      success: true,
      meter_id: meterId,
      tolerance_kwh: RECONCILIATION_TOLERANCE_KWH,
      message: "Bill reconciliation analysis completed.",
      summary,
      data: reconciliations,
    });
  } catch (error) {
    next(error);
  }
});

// Format a timestamp as a calendar date in Indian Standard Time.
function localDate(timestamp) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

module.exports = router;