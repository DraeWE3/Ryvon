import { createUser, createVerificationCode, getUser } from "./queries";

async function test() {
  const email = "test" + Date.now() + "@example.com";
  try {
    console.log("Creating user...", email);
    await createUser(email, "password123");
    console.log("User created!");

    console.log("Creating verification code...");
    const code = await createVerificationCode(email);
    console.log("Code created:", code);

    const [u] = await getUser(email);
    console.log("User retrieved:", u);
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

test().then(() => process.exit(0)).catch(() => process.exit(1));
