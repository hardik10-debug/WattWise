
jest.mock("../src/config/db", () => ({
  query: jest.fn(),
}));

const request = require("supertest");
const pool = require("../src/config/db");
const app = require("../src/app");

afterEach(() => {
  pool.query.mockReset();
});

describe("Consumption Analytics API", () => {
  test("calculates intervals between consecutive readings", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: "1",
          meter_id: "1",
          reading_value_kwh: "12450.000",
          recorded_at: "2026-08-31T18:30:00.000Z",
          source: "manual",
        },
        {
          id: "2",
          meter_id: "1",
          reading_value_kwh: "12750.000",
          recorded_at: "2026-09-29T18:30:00.000Z",
          source: "manual",
        },
        {
          id: "3",
          meter_id: "1",
          reading_value_kwh: "12755.000",
          recorded_at: "2026-10-12T06:30:00.000Z",
          source: "manual",
        },
      ],
      rowCount: 3,
    });

    const response = await request(app)
      .get("/api/analytics/consumption")
      .query({ meter_id: "1" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.readings_count).toBe(3);
    expect(response.body.intervals_count).toBe(2);
    expect(response.body.data[0].consumption).toBe(300);
    expect(response.body.data[1].consumption).toBe(5);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("rejects a missing meter ID", async () => {
    const response = await request(app)
      .get("/api/analytics/consumption");

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("returns no intervals when fewer than two readings exist", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: "1",
          meter_id: "1",
          reading_value_kwh: "12450.000",
          recorded_at: "2026-08-31T18:30:00.000Z",
          source: "manual",
        },
      ],
      rowCount: 1,
    });

    const response = await request(app)
      .get("/api/analytics/consumption")
      .query({ meter_id: "1" });

    expect(response.status).toBe(200);
    expect(response.body.readings_count).toBe(1);
    expect(response.body.intervals_count).toBe(0);
    expect(response.body.data).toEqual([]);
    expect(response.body.message).toBe(
      "At least two readings are needed to calculate consumption."
    );
  });

  test("flags a decreasing reading for review", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: "1",
          meter_id: "1",
          reading_value_kwh: "12750.000",
          recorded_at: "2026-09-29T18:30:00.000Z",
          source: "manual",
        },
        {
          id: "2",
          meter_id: "1",
          reading_value_kwh: "100.000",
          recorded_at: "2026-10-12T06:30:00.000Z",
          source: "manual",
        },
      ],
      rowCount: 2,
    });

    const response = await request(app)
      .get("/api/analytics/consumption")
      .query({ meter_id: "1" });

    expect(response.status).toBe(200);
    expect(response.body.data[0].success).toBe(false);
    expect(response.body.data[0].status).toBe("review_required");
    expect(response.body.data[0].consumption).toBeNull();
  });

  test("flags readings with the same timestamp", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: "1",
          meter_id: "1",
          reading_value_kwh: "100.000",
          recorded_at: "2026-10-01T10:00:00.000Z",
          source: "manual",
        },
        {
          id: "2",
          meter_id: "1",
          reading_value_kwh: "110.000",
          recorded_at: "2026-10-01T10:00:00.000Z",
          source: "manual",
        },
      ],
      rowCount: 2,
    });

    const response = await request(app)
      .get("/api/analytics/consumption")
      .query({ meter_id: "1" });

    expect(response.status).toBe(200);
    expect(response.body.data[0].zero_duration_warning).toBe(true);
    expect(response.body.data[0].days_between_readings).toBe(0);
    expect(
      response.body.data[0].average_daily_consumption_kwh
    ).toBeNull();
    expect(response.body.data[0].data_quality).toBe(
      "zero_duration"
    );
  });

  test("flags intervals longer than 45 days", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: "1",
          meter_id: "1",
          reading_value_kwh: "100.000",
          recorded_at: "2026-01-01T00:00:00.000Z",
          source: "manual",
        },
        {
          id: "2",
          meter_id: "1",
          reading_value_kwh: "200.000",
          recorded_at: "2026-03-02T00:00:00.000Z",
          source: "manual",
        },
      ],
      rowCount: 2,
    });

    const response = await request(app)
      .get("/api/analytics/consumption")
      .query({ meter_id: "1" });

    expect(response.status).toBe(200);
    expect(response.body.data[0].gap_warning).toBe(true);
    expect(response.body.data[0].data_quality).toBe("long_gap");
    expect(
      response.body.data[0].average_daily_consumption_kwh
    ).not.toBeNull();
  });

  test("does not report consumption for a decreasing reading", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: "1",
          meter_id: "1",
          reading_value_kwh: "500.000",
          recorded_at: "2026-10-01T00:00:00.000Z",
          source: "manual",
        },
        {
          id: "2",
          meter_id: "1",
          reading_value_kwh: "100.000",
          recorded_at: "2026-10-10T00:00:00.000Z",
          source: "manual",
        },
      ],
      rowCount: 2,
    });

    const response = await request(app)
      .get("/api/analytics/consumption")
      .query({ meter_id: "1" });

    expect(response.status).toBe(200);
    expect(response.body.data[0].success).toBe(false);
    expect(response.body.data[0].status).toBe("review_required");
    expect(response.body.data[0].consumption).toBeNull();
    expect(
      response.body.data[0].average_daily_consumption_kwh
    ).toBeNull();
    expect(response.body.data[0].data_quality).toBe(
      "review_required"
    );
  });
});

describe("Bill Reconciliation API", () => {
  test("marks a bill as matched when consumption agrees", async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "1",
            meter_id: "1",
            billing_start_date: "2026-09-01",
            billing_end_date: "2026-09-30",
            units_consumed: "300.00",
            bill_amount: "2450.00",
            reading_type: "actual",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "1",
            reading_value_kwh: "12450.000",
            recorded_at: "2026-08-31T18:30:00.000Z",
            source: "manual",
          },
          {
            id: "2",
            reading_value_kwh: "12750.000",
            recorded_at: "2026-09-29T18:30:00.000Z",
            source: "manual",
          },
        ],
      });

    const response = await request(app)
      .get("/api/analytics/reconciliation")
      .query({ meter_id: "1" });

    expect(response.status).toBe(200);
    expect(response.body.summary.matched).toBe(1);
    expect(response.body.data[0].calculated_units_kwh).toBe(300);
    expect(response.body.data[0].difference_kwh).toBe(0);
    expect(response.body.data[0].status).toBe("matched");
  });

  test("flags a discrepancy when consumption differs beyond tolerance", async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "1",
            meter_id: "1",
            billing_start_date: "2026-09-01",
            billing_end_date: "2026-09-30",
            units_consumed: "280.00",
            bill_amount: "2300.00",
            reading_type: "actual",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "1",
            reading_value_kwh: "12450.000",
            recorded_at: "2026-08-31T18:30:00.000Z",
            source: "manual",
          },
          {
            id: "2",
            reading_value_kwh: "12750.000",
            recorded_at: "2026-09-29T18:30:00.000Z",
            source: "manual",
          },
        ],
      });

    const response = await request(app)
      .get("/api/analytics/reconciliation")
      .query({ meter_id: "1" });

    expect(response.status).toBe(200);
    expect(response.body.summary.discrepancies).toBe(1);
    expect(response.body.data[0].calculated_units_kwh).toBe(300);
    expect(response.body.data[0].difference_kwh).toBe(20);
    expect(response.body.data[0].status).toBe("discrepancy");
  });

  test("reports insufficient data when boundary readings are missing", async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "1",
            meter_id: "1",
            billing_start_date: "2026-09-01",
            billing_end_date: "2026-09-30",
            units_consumed: "300.00",
            bill_amount: "2450.00",
            reading_type: "actual",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "1",
            reading_value_kwh: "12450.000",
            recorded_at: "2026-08-31T18:30:00.000Z",
            source: "manual",
          },
        ],
      });

    const response = await request(app)
      .get("/api/analytics/reconciliation")
      .query({ meter_id: "1" });

    expect(response.status).toBe(200);
    expect(response.body.summary.insufficient_data).toBe(1);
    expect(response.body.data[0].status).toBe("insufficient_data");
    expect(response.body.data[0].calculated_units_kwh).toBeNull();
  });

  test("requires review for an estimated bill", async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "1",
            meter_id: "1",
            billing_start_date: "2026-09-01",
            billing_end_date: "2026-09-30",
            units_consumed: "300.00",
            bill_amount: "2450.00",
            reading_type: "estimated",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [],
      });

    const response = await request(app)
      .get("/api/analytics/reconciliation")
      .query({ meter_id: "1" });

    expect(response.status).toBe(200);
    expect(response.body.summary.review_required).toBe(1);
    expect(response.body.data[0].status).toBe("review_required");
    expect(response.body.data[0].calculated_units_kwh).toBeNull();
  });

  test("rejects an invalid meter ID for reconciliation", async () => {
    const response = await request(app)
      .get("/api/analytics/reconciliation")
      .query({ meter_id: "abc" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("requires review when multiple readings exist on a billing boundary", async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "1",
            meter_id: "1",
            billing_start_date: "2026-09-01",
            billing_end_date: "2026-09-30",
            units_consumed: "300.00",
            bill_amount: "2450.00",
            reading_type: "actual",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "1",
            reading_value_kwh: "12450.000",
            recorded_at: "2026-08-31T18:30:00.000Z",
            source: "manual",
          },
          {
            id: "2",
            reading_value_kwh: "12455.000",
            recorded_at: "2026-08-31T19:30:00.000Z",
            source: "manual",
          },
          {
            id: "3",
            reading_value_kwh: "12750.000",
            recorded_at: "2026-09-29T18:30:00.000Z",
            source: "manual",
          },
        ],
      });

    const response = await request(app)
      .get("/api/analytics/reconciliation")
      .query({ meter_id: "1" });

    expect(response.status).toBe(200);
    expect(response.body.summary.review_required).toBe(1);
    expect(response.body.data[0].status).toBe("review_required");
    expect(
      response.body.data[0].opening_reading_candidates
    ).toBe(2);
    expect(
      response.body.data[0].closing_reading_candidates
    ).toBe(1);
    expect(response.body.data[0].calculated_units_kwh).toBeNull();
  });
});
