import express, { type ErrorRequestHandler } from "express";
import { pool } from "./db.js";

const app = express();

// HTTPS ends at Containify's edge, which forwards requests with X-Forwarded-For
// and X-Forwarded-Proto. Trust that one hop.
app.set("trust proxy", 1);
app.use(express.json());

app.get("/", (_req, res) => {
	res.json({
		name: "express-starter",
		message: "Hello from Express on Containify",
		routes: ["GET /health", "GET /notes", "POST /notes"],
	});
});

// The health check: answers as long as the server is up.
app.get("/health", (_req, res) => {
	res.send("ok");
});

app.get("/notes", async (_req, res) => {
	const { rows } = await pool.query("select id, body, created_at from notes order by id desc limit 50");
	res.json(rows);
});

app.post("/notes", async (req, res) => {
	const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
	if (!body || body.length > 1000) {
		res.status(400).json({ error: "body must be 1 to 1000 characters" });
		return;
	}
	const { rows } = await pool.query("insert into notes (body) values ($1) returning id, body, created_at", [body]);
	res.status(201).json(rows[0]);
});

app.use((_req, res) => {
	res.status(404).json({ error: "not found" });
});

// Express 5 passes errors thrown in async handlers here.
const onError: ErrorRequestHandler = (err, _req, res, _next) => {
	console.error(err);
	res.status(500).json({ error: "Internal Server Error" });
};
app.use(onError);

// Containify sets HOST=:: (IPv6 and IPv4). PORT is set by the template.
const host = process.env.HOST ?? "::";
const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, host, () => {
	console.log(`Listening on [${host}]:${port}`);
});

// A deploy stops the old replica with SIGTERM: finish requests in flight, then exit.
process.on("SIGTERM", () => {
	server.close(async () => {
		await pool.end();
		process.exit(0);
	});
	setTimeout(() => process.exit(0), 10_000).unref();
});
