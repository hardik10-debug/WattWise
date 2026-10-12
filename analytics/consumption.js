
function calculateConsumption(earlierReading, laterReading) {
  // Check that both readings were provided.
  if (earlierReading === null || earlierReading === undefined ||
      laterReading === null || laterReading === undefined) {
    return {
      success: false,
      status: "missing_data",
      message: "Both readings are required.",
      consumption: null,
    };
  }

  // Convert values to numbers and reject invalid input.
  const earlier = Number(earlierReading);
  const later = Number(laterReading);

  if (
    !Number.isFinite(earlier) ||
    !Number.isFinite(later) ||
    earlier < 0 ||
    later < 0
  ) {
    return {
      success: false,
      status: "invalid_data",
      message: "Readings must be valid non-negative numbers.",
      consumption: null,
    };
  }

  // A lower later reading may indicate a reset or meter replacement.
  if (later < earlier) {
    return {
      success: false,
      status: "review_required",
      message: "The later reading is lower. Check for a meter reset or replacement.",
      consumption: null,
    };
  }

  // Calculate the increase in cumulative meter readings.
  const consumption = Number((later - earlier).toFixed(3));

  return {
    success: true,
    status: "calculated",
    message: "Consumption calculated successfully.",
    consumption,
    unit: "kWh",
  };
}

module.exports = { calculateConsumption };
