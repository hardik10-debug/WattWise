
jest.mock("../src/config/db", () => ({
  query: jest.fn(),
}));

const request = require("supertest");
const pool = require("../src/config/db");
const app = require("../src/app");

afterEach(() => {
  pool.query.mockReset();
});

describe("Bills API", () => {
  test("retrieves bills with meter and property details", async () => {
    const bills = [
      {
        id: "1",
        meter_id: "1",
        billing_start_date: "2026-09-01",
        billing_end_date: "2026-09-30",
        units_consumed: "300.00",
        bill_amount: "2450.00",
        opening_reading_kwh: "12450.000",
        closing_reading_kwh: "12750.000",
        reading_type: "actual",
        created_at: "2026-10-12T05:44:53.252Z",
        meter_number: "DEMO-METER-001",
        meter_name: "Main Electricity Meter",
        property_id: "1",
        property_name: "Demo Home",
        city: "Dehradun",
        state: "Uttarakhand",
      },
    ];

    pool.query.mockResolvedValueOnce({
      rows: bills,
      rowCount: bills.length,
    });

    const response = await request(app).get("/api/bills");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(1);
    expect(response.body.data).toEqual(bills);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("creates a valid bill", async () => {
    const bill = {
      id: "2",
      meter_id: "1",
      billing_start_date: "2026-10-01",
      billing_end_date: "2026-10-31",
      units_consumed: "280.00",
      bill_amount: "2300.00",
      opening_reading_kwh: "12750.000",
      closing_reading_kwh: "13030.000",
      reading_type: "actual",
      created_at: "2026-10-12T10:00:00.000Z",
    };

    pool.query.mockResolvedValueOnce({
      rows: [bill],
      rowCount: 1,
    });

    const response = await request(app)
      .post("/api/bills")
      .send({
        meter_id: 1,
        billing_start_date: "2026-10-01",
        billing_end_date: "2026-10-31",
        units_consumed: 280,
        bill_amount: 2300,
        opening_reading_kwh: 12750,
        closing_reading_kwh: 13030,
        reading_type: "actual",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Bill created successfully");
    expect(response.body.data).toEqual(bill);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("rejects an invalid meter ID", async () => {
    const response = await request(app)
      .post("/api/bills")
      .send({
        meter_id: -1,
        billing_start_date: "2026-11-01",
        billing_end_date: "2026-11-30",
        units_consumed: 100,
        bill_amount: 900,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("rejects a billing period with the end date before the start date", async () => {
    const response = await request(app)
      .post("/api/bills")
      .send({
        meter_id: 1,
        billing_start_date: "2026-11-30",
        billing_end_date: "2026-11-01",
        units_consumed: 100,
        bill_amount: 900,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("rejects negative units consumed", async () => {
    const response = await request(app)
      .post("/api/bills")
      .send({
        meter_id: 1,
        billing_start_date: "2026-11-01",
        billing_end_date: "2026-11-30",
        units_consumed: -100,
        bill_amount: 900,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("rejects an unsupported reading type", async () => {
    const response = await request(app)
      .post("/api/bills")
      .send({
        meter_id: 1,
        billing_start_date: "2026-11-01",
        billing_end_date: "2026-11-30",
        units_consumed: 100,
        bill_amount: 900,
        reading_type: "unknown",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("rejects a bill when the meter does not exist", async () => {
    pool.query.mockRejectedValueOnce({
      code: "23503",
    });

    const response = await request(app)
      .post("/api/bills")
      .send({
        meter_id: 999999,
        billing_start_date: "2026-11-01",
        billing_end_date: "2026-11-30",
        units_consumed: 100,
        bill_amount: 900,
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "The specified meter does not exist."
    );
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("rejects an overlapping billing period", async () => {
    pool.query.mockRejectedValueOnce({
      code: "23P01",
    });

    const response = await request(app)
      .post("/api/bills")
      .send({
        meter_id: 1,
        billing_start_date: "2026-09-15",
        billing_end_date: "2026-10-15",
        units_consumed: 100,
        bill_amount: 900,
      });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      "This billing period overlaps an existing bill for the meter."
    );
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});
