import dotenv from "dotenv";
import { connectDB } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { hashPassword } from "../src/utils/password.js";

dotenv.config();

connectDB()
  .then(async () => {
    const email = (process.env.ADMIN_EMAIL || "kartartravelsltd@gmail.com").toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD || "Admin@123456";
    const passwordHash = await hashPassword(password);

    const existing = await User.findOne({ email });
    if (existing) {
      existing.passwordHash = passwordHash;
      existing.role = "admin";
      if (!existing.name?.trim()) existing.name = "System Admin";
      await existing.save();
      console.log("Admin password updated and role set to admin:", email);
      process.exit(0);
      return;
    }

    await User.create({
      email,
      passwordHash,
      name: "System Admin",
      role: "admin",
    });
    console.log("Admin created:", email);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
