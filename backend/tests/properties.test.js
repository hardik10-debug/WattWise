const request = require("supertest");
const app = require("../src/app");

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
  });
});