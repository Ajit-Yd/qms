// Loads .env.local (then .env) for standalone scripts (tsx checks) that run
// outside Next.js, which is the only place those envs are auto-loaded.
import { config } from "dotenv";
import { existsSync } from "node:fs";

if (!process.env.DATABASE_URL && existsSync(".env.local")) config({ path: ".env.local" });
if (!process.env.DATABASE_URL && existsSync(".env")) config({ path: ".env" });