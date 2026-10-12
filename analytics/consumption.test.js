
const { calculateConsumption } = require("./consumption");

describe("calculateConsumption", () => {
  test("calculates consumption from valid readings", () => {
    const result = calculateConsumption(12450, 12750);

    expect(result.success).toBe(true);
    expect(result.status).toBe("calculated");
    expect(result.consumption).toBe(300);
    expect(result.unit).toBe("kWh");
  });

  test("accepts readings supplied as numeric strings", () => {
    const result = calculateConsumption("12450", "12750");

    expect(result.success).toBe(true);
    expect(result.consumption).toBe(300);
  });

  test("returns zero for equal readings", () => {
    const result = calculateConsumption(1000, 1000);

    expect(result.success).toBe(true);
    expect(result.consumption).toBe(0);
  });

  test("flags a missing earlier reading", () => {
    const result = calculateConsumption(null, 12750);

    expect(result.success).toBe(false);
    expect(result.status).toBe("missing_data");
    expect(result.consumption).toBeNull();
  });

  test("flags a missing later reading", () => {
    const result = calculateConsumption(12450, undefined);

    expect(result.success).toBe(false);
    expect(result.status).toBe("missing_data");
  });

  test("rejects negative readings", () => {
    const result = calculateConsumption(-10, 100);

    expect(result.success).toBe(false);
    expect(result.status).toBe("invalid_data");
  });

  test("rejects non-numeric readings", () => {
    const result = calculateConsumption("abc", 100);

    expect(result.success).toBe(false);
    expect(result.status).toBe("invalid_data");
  });

  test("flags a lower later reading for review", () => {
    const result = calculateConsumption(12750, 12400);

    expect(result.success).toBe(false);
    expect(result.status).toBe("review_required");
    expect(result.consumption).toBeNull();
  });
});
