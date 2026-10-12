
const { calculateConsumption } = require("./consumption");

console.log(
  "Normal readings:",
  calculateConsumption(12450, 12750)
);

console.log(
  "Missing reading:",
  calculateConsumption(12450, null)
);

console.log(
  "Lower later reading:",
  calculateConsumption(12750, 12400)
);

console.log(
  "Invalid reading:",
  calculateConsumption(-10, 100)
);
