import pg from "pg";

// DATABASE_URL comes from the Postgres app: {{ "Postgres".DATABASE_URL }}.
export const pool = new pg.Pool({
	connectionString: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/app",
	max: 10,
});
