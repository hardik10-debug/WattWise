
jest.mock("../src/config/db", () => ({
  query: jest.fn(),
}));

const request = require("supertest");
const pool = require("../src/config/db");
const app = require("../src/app");

afterEach(() => {
  pool.query.mockReset();
});

describe("Meter Readings API", () => {
  test("retrieves readings with meter and property details", async () => {
    const readings = [
      {
        id: "2",
        meter_id: "1",
        reading_value_kwh: "12750.000",
        recorded_at: "2026-09-29T18:30:00.000Z",
        source: "manual",
        note: "Closing reading for demo",
        created_at: "2026-10-12T06:05:36.833Z",
        meter_number: "DEMO-METER-001",
        meter_name: "Main Electricity Meter",
        property_id: "1",
        property_name: "Demo Home",
        city: "Dehradun",
        state: "Uttarakhand",
      },
    ];

    pool.query.mockResolvedValueOnce({
      rows: readings,
      rowCount: readings.length,
    });

    const response = await request(app).get("/api/readings");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(1);
    expect(response.body.data).toEqual(readings);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("creates a valid meter reading", async () => {
    const reading = {
      id: "3",
      meter_id: "1",
      reading_value_kwh: "12755.000",
      recorded_at: "2026-10-12T06:30:00.000Z",
      source: "manual",
      note: "Demo reading for API testing",
      created_at: "2026-10-12T06:30:00.000Z",
    };

    pool.query.mockResolvedValueOnce({
      rows: [reading],
      rowCount: 1,
    });

    const response = await request(app)
      .post("/api/readings")
      .send({
        meter_id: 1,
        reading_value_kwh: 12755,
        recorded_at: "2026-10-12T12:00:00+05:30",
        source: "manual",
        note: "Demo reading for API testing",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Meter reading created successfully"
    );
    expect(response.body.data).toEqual(reading);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("rejects a missing meter ID", async () => {
    const response = await request(app)
      .post("/api/readings")
      .send({
        reading_value_kwh: 12755,
        recorded_at: "2026-10-12T12:00:00+05:30",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("rejects a negative meter reading", async () => {
    const response = await request(app)
      .post("/api/readings")
      .send({
        meter_id: 1,
        reading_value_kwh: -10,
        recorded_at: "2026-10-12T13:00:00+05:30",
        source: "manual",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "reading_value_kwh must be a non-negative number."
    );
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("rejects an invalid timestamp", async () => {
    const response = await request(app)
      .post("/api/readings")
      .send({
        meter_id: 1,
        reading_value_kwh: 12755,
        recorded_at: "not-a-date",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("rejects an unsupported source", async () => {
    const response = await request(app)
      .post("/api/readings")
      .send({
        meter_id: 1,
        reading_value_kwh: 12755,
        recorded_at: "2026-10-12T12:00:00+05:30",
        source: "unknown",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("returns an error when the meter does not exist", async () => {
    pool.query.mockRejectedValueOnce({
      code: "23503",
    });

    const response = await request(app)
      .post("/api/readings")
      .send({
        meter_id: 999999,
        reading_value_kwh: 12755,
        recorded_at: "2026-10-12T12:00:00+05:30",
        source: "manual",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "The specified meter does not exist."
    );
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});
