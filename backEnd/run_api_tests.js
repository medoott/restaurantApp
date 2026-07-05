import * as dotenv from "dotenv";
dotenv.config();
process.env.NODE_ENV = "test";

// Dynamically import dependencies after config is loaded
const connectedDB = (await import("./src/DB/connection.js")).default;
const userModel = (await import("./src/DB/model/User.model.js")).default;
const { generateToken } = await import("./src/util/security/token.js");
const { generateEncrypt } = await import("./src/util/security/crypt.js");
const mongoose = (await import("mongoose")).default;
const http = (await import("node:http")).default;
const createApp = (await import("./src/config/app.js")).default;
const { initSocket } = await import("./src/config/socket.js");

const PORT = 3009; // Use unique port for integration tests
const BASE_URL = `http://localhost:${PORT}`;

async function main() {
  console.log("Starting Programmatic Server for API Integration Test Suite...");
  console.log("DEBUG: process.env.TOKEN_SIGNATURE =", process.env.TOKEN_SIGNATURE);
  await connectedDB();

  // Create and boot server in test mode
  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  await new Promise((resolve) => {
    server.listen(PORT, () => {
      console.log(`Test Server running at ${BASE_URL}`);
      resolve();
    });
  });

  const testPhone = generateEncrypt({ text: "0123456789" });

  // Find or create admin user for testing tokens
  let admin = await userModel.findOne({ email: "mohamedeltt1@gmail.com" });
  if (!admin) {
    console.error("Admin mohamedeltt1@gmail.com not found. Creating temporary admin...");
    admin = await userModel.create({
      name: "Test Admin",
      email: "mohamedeltt1@gmail.com",
      phone: testPhone,
      role: "Admin",
      confirmEmail: true,
      password: "tempPassword123!"
    });
  } else {
    await userModel.updateOne({ _id: admin._id }, { $set: { phone: testPhone } });
  }

  // Find or create cashier user for testing role auth
  let cashier = await userModel.findOne({ email: "cashier_test@gmail.com" });
  if (!cashier) {
    cashier = await userModel.create({
      name: "Test Cashier",
      email: "cashier_test@gmail.com",
      phone: testPhone,
      role: "Cashier",
      confirmEmail: true,
      password: "tempPassword123!"
    });
  } else {
    await userModel.updateOne({ _id: cashier._id }, { $set: { phone: testPhone } });
  }

  // Generate tokens
  const adminToken = generateToken({
    payload: { id: admin._id, isLoggedIn: true, role: "Admin" },
    signature: process.env.TOKEN_SIGNATURE,
    expiresIn: 600
  });

  const adminHeaders = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${adminToken}`
  };

  const cashierToken = generateToken({
    payload: { id: cashier._id, isLoggedIn: true, role: "Cashier" },
    signature: process.env.TOKEN_SIGNATURE,
    expiresIn: 600
  });

  const cashierHeaders = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${cashierToken}`
  };

  const guestHeaders = {
    "Content-Type": "application/json"
  };

  const results = [];

  async function testEndpoint(name, path, options = {}, expectedStatus = 200) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, options);
      const status = res.status;
      let body;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      
      const passed = status === expectedStatus;
      results.push({
        name,
        path,
        method: options.method || "GET",
        expectedStatus,
        receivedStatus: status,
        passed,
        error: passed ? null : `Expected status ${expectedStatus}, received ${status}. Body: ${JSON.stringify(body)}`
      });
      console.log(`[TEST] ${name}: ${passed ? "PASSED" : "FAILED"} (${status})`);
    } catch (err) {
      results.push({
        name,
        path,
        method: options.method || "GET",
        expectedStatus,
        receivedStatus: 0,
        passed: false,
        error: err.message
      });
      console.log(`[TEST] ${name}: FAILED (Error: ${err.message})`);
    }
  }

  // --- RUN ENDPOINT TESTS ---
  
  // 1. Health Check
  await testEndpoint("GET /health (No auth)", "/health", { method: "GET" }, 200);

  // 2. Auth Module
  await testEndpoint("POST /auth/login (Invalid credentials)", "/auth/login", {
    method: "POST",
    headers: guestHeaders,
    body: JSON.stringify({ email: "nonexistent@gmail.com", password: "wrong" })
  }, 400);

  await testEndpoint("POST /auth/signup (Validation mismatch)", "/auth/signup", {
    method: "POST",
    headers: guestHeaders,
    body: JSON.stringify({
      name: "X",
      email: "invalid-email",
      password: "123",
      confirmationPassword: "456",
      phone: "123"
    })
  }, 400);

  // 3. User Module
  await testEndpoint("GET /user/profile (Admin auth)", "/user/profile", {
    method: "GET",
    headers: adminHeaders
  }, 200);

  await testEndpoint("GET /user/profile (No auth)", "/user/profile", {
    method: "GET",
    headers: guestHeaders
  }, 401);

  // 4. Products Module
  await testEndpoint("GET /products (No auth - optionalAuth)", "/products", {
    method: "GET",
    headers: guestHeaders
  }, 200);

  await testEndpoint("POST /products (No auth)", "/products", {
    method: "POST",
    headers: guestHeaders,
    body: JSON.stringify({ name: "Espresso", price: 3 })
  }, 401);

  await testEndpoint("POST /products (Admin auth)", "/products", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ name: "Espresso " + Date.now(), price: 3.5, category: "Coffee" })
  }, 201);

  // 5. Orders Module
  await testEndpoint("GET /orders (No auth)", "/orders", {
    method: "GET",
    headers: guestHeaders
  }, 401);

  await testEndpoint("GET /orders (Admin auth)", "/orders", {
    method: "GET",
    headers: adminHeaders
  }, 200);

  await testEndpoint("GET /orders/stats (Admin auth)", "/orders/stats", {
    method: "GET",
    headers: adminHeaders
  }, 200);

  await testEndpoint("POST /orders (Guest order placement)", "/orders", {
    method: "POST",
    headers: guestHeaders,
    body: JSON.stringify({
      customer: "Guest Customer",
      itemsDetail: [{ name: "Espresso", qty: 1, price: 3.5 }],
      total: 3.5,
      payment: "Cash"
    })
  }, 201);

  // 6. Settings Module
  await testEndpoint("GET /settings (No auth)", "/settings", {
    method: "GET",
    headers: guestHeaders
  }, 401);

  await testEndpoint("GET /settings (Cashier auth - forbidden role)", "/settings", {
    method: "GET",
    headers: cashierHeaders
  }, 403);

  await testEndpoint("GET /settings (Admin auth)", "/settings", {
    method: "GET",
    headers: adminHeaders
  }, 200);

  await testEndpoint("GET /settings/backup (Admin auth)", "/settings/backup", {
    method: "GET",
    headers: adminHeaders
  }, 200);

  // 7. Tables Module
  await testEndpoint("GET /tables (No auth)", "/tables", {
    method: "GET",
    headers: guestHeaders
  }, 401);

  await testEndpoint("GET /tables (Admin auth)", "/tables", {
    method: "GET",
    headers: adminHeaders
  }, 200);

  // 8. Waiter Module
  await testEndpoint("GET /waiter/requests (No auth)", "/waiter/requests", {
    method: "GET",
    headers: guestHeaders
  }, 401);

  await testEndpoint("GET /waiter/requests (Admin auth)", "/waiter/requests", {
    method: "GET",
    headers: adminHeaders
  }, 200);

  // 9. Audit Logs
  await testEndpoint("GET /audit-logs (No auth)", "/audit-logs", {
    method: "GET",
    headers: guestHeaders
  }, 401);

  await testEndpoint("GET /audit-logs (Admin auth)", "/audit-logs", {
    method: "GET",
    headers: adminHeaders
  }, 200);

  // Clean up temporary cashier user if created for this test
  if (cashier) {
    await userModel.deleteOne({ email: "cashier_test@gmail.com" });
  }

  console.log("\n--- TEST SUMMARY ---");
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Passed: ${passed}, Failed: ${failed}`);

  if (failed > 0) {
    console.error("Test failures detected!");
    results.filter(r => !r.passed).forEach(r => {
      console.error(`- FAILED: ${r.name} -> ${r.error}`);
    });
  }

  // Shut down programmatic test server
  await new Promise((resolve) => {
    server.close(() => {
      console.log("Test Server shut down successfully.");
      resolve();
    });
  });

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error("Fatal Test Suite error:", err);
  await mongoose.disconnect();
  process.exit(1);
});
