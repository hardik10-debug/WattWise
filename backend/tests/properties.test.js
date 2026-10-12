
jest.mock("../src/config/db", () => ({
  query: jest.fn(),
}));

const request = require("supertest");
const pool = require("../src/config/db");
const app = require("../src/app");

afterEach(() => {
  pool.query.mockReset();
});

describe("Properties API", () => {
  test("rejects a property with an empty name", async () => {
    const response = await request(app)
      .post("/api/properties")
      .send({
        name: "",
        city: "Dehradun",
        state: "Uttarakhand",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Name, city and state are required."
    );
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("creates a valid property", async () => {
    const property = {
      id: 10,
      name: "Test Home",
      city: "Dehradun",
      state: "Uttarakhand",
      created_at: "2026-10-12T10:00:00.000Z",
    };

    pool.query.mockResolvedValueOnce({
      rows: [property],
      rowCount: 1,
    });

    const response = await request(app)
      .post("/api/properties")
      .send({
        name: "Test Home",
        city: "Dehradun",
        state: "Uttarakhand",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Property created successfully"
    );
    expect(response.body.data).toEqual(property);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("retrieves properties", async () => {
    const properties = [
      {
        id: 10,
        name: "Test Home",
        city: "Dehradun",
        state: "Uttarakhand",
        created_at: "2026-10-12T10:00:00.000Z",
      },
    ];

    pool.query.mockResolvedValueOnce({
      rows: properties,
      rowCount: properties.length,
    });

    const response = await request(app).get("/api/properties");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(1);
    expect(response.body.data).toEqual(properties);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});
