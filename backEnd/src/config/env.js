export function validateEnv() {
  const required = [
    "DB_URL",
    "TOKEN_SIGNATURE",
    "TOKEN_SIGNATURE_ADMIN",
    "CRYPT_SIGNATURE",
    "EMAIL_TOKEN_SIGNATURE",
    "FRONT_END_URL",
    "CORS_ORIGIN",
  ];

  const missing = [];
  for (const key of required) {
    if (!process.env[key] || process.env[key].trim() === "") {
      missing.push(key);
    }
  }

  const productionRequired = ["TOKEN_SIGNATURE_DEVELOPER", "TABLE_SESSION_SECRET"];
  if (process.env.NODE_ENV === "production") {
    for (const key of productionRequired) {
      if (!process.env[key] || process.env[key].trim() === "") {
        missing.push(key);
      }
    }
  }

  if (missing.length > 0) {
    console.error("=====================================================================");
    console.error("CRITICAL CONFIGURATION ERROR: Missing required environment variables:");
    console.error("---------------------------------------------------------------------");
    missing.forEach((v) => console.error(`  - ${v}`));
    console.error("=====================================================================");
    process.exit(1);
  }

  const secrets = [
    "TOKEN_SIGNATURE",
    "TOKEN_SIGNATURE_ADMIN",
    "CRYPT_SIGNATURE",
    "EMAIL_TOKEN_SIGNATURE",
  ];

  if (process.env.NODE_ENV === "production") {
    const minSecretLen = 32;
    let hasWeakSecret = false;

    for (const key of [...secrets, ...productionRequired]) {
      const val = process.env[key] || "";
      if (val.length < minSecretLen) {
        console.error(`CRITICAL: ${key} is too short for production (${val.length}/${minSecretLen} chars).`);
        hasWeakSecret = true;
      }
      if (/^(secret|password|key|test|example|default|change.?me)/i.test(val)) {
        console.error(`CRITICAL: ${key} appears to use a weak/default value.`);
        hasWeakSecret = true;
      }
      if (/^[a-z]+$/.test(val) || /^\d+$/.test(val)) {
        console.error(`CRITICAL: ${key} must contain a mix of characters (not just letters or digits).`);
        hasWeakSecret = true;
      }
    }

    if (hasWeakSecret) {
      console.error("=====================================================================");
      console.error("Server cannot start with weak secrets in production.");
      console.error("Generate strong secrets: node -e \"console.log(require('crypto').randomBytes(48).toString('base64'))\"");
      console.error("=====================================================================");
      process.exit(1);
    }
  }
}
