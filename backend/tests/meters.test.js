
jest.mock("../src/config/db", () => ({
  query: jest.fn(),
}));

const request = require("supertest");
const pool = require("../src/config/db");
const app = require("../src/app");

afterEach(() => {
  pool.query.mockReset();
});

describe("Meters API", () => {
  test("retrieves meters with property details", async () => {
    const meters = [
      {
        id: "1",
        property_id: "1",
        meter_number: "DEMO-METER-001",
        name: "Main Electricity Meter",
        unit: "kWh",
        is_active: true,
        created_at: "2026-10-12T05:44:53.252Z",
        property_name: "Demo Home",
        city: "Dehradun",
        state: "Uttarakhand",
      },
    ];

    pool.query.mockResolvedValueOnce({
      rows: meters,
      rowCount: meters.length,
    });

    const response = await request(app).get("/api/meters");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(1);
    expect(response.body.data).toEqual(meters);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("creates a valid meter", async () => {
    const meter = {
      id: "2",
      property_id: "1",
      meter_number: "TEST-METER-001",
      name: "Test Electricity Meter",
      unit: "kWh",
      is_active: true,
      created_at: "2026-10-12T10:00:31.913Z",
    };

    pool.query.mockResolvedValueOnce({
      rows: [meter],
      rowCount: 1,
    });

    const response = await request(app)
      .post("/api/meters")
      .send({
        property_id: 1,
        meter_number: "TEST-METER-001",
        name: "Test Electricity Meter",
        unit: "kWh",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(meter);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("rejects a missing property ID", async () => {
    const response = await request(app)
      .post("/api/meters")
      .send({
        meter_number: "INVALID-METER",
        name: "Invalid Test Meter",
        unit: "kWh",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("rejects an invalid meter unit", async () => {
    const response = await request(app)
      .post("/api/meters")
      .send({
        property_id: 1,
        meter_number: "INVALID-UNIT-METER",
        name: "Invalid Unit Meter",
        unit: "litres",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("returns an error when the property does not exist", async () => {
    pool.query.mockRejectedValueOnce({
      code: "23503",
    });

    const response = await request(app)
      .post("/api/meters")
      .send({
        property_id: 999999,
        meter_number: "INVALID-PROPERTY-METER",
        name: "Invalid Test Meter",
        unit: "kWh",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "The specified property does not exist."
    );
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});
