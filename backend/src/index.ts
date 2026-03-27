import "dotenv/config";
import cors from "cors";
import express from "express";
import { analyzeRouter } from "./routes/analyze";
import { mergeRouter } from "./routes/merge";
import { authRouter } from "./routes/auth";
import { prospectingRouter } from "./routes/prospecting";
import { retentionRouter } from "./routes/retention";
import webhookRouter from "./routes/webhooks";
import approvalRouter from "./routes/approvals";
import { initializePool, checkDatabaseConnection } from "./db/connection";

const app = express();
app.use(express.json({ limit: "2mb" }));


app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api", analyzeRouter);
app.use("/api/merge", mergeRouter);
app.use("/api/hubspot", mergeRouter);
app.use("/api/prospecting", prospectingRouter);
app.use("/api/retention", retentionRouter);
app.use("/api/webhooks", webhookRouter);
app.use("/api/approvals", approvalRouter);

const port = Number(process.env.PORT ?? 3001);

async function startServer() {
  try {
    // Initialize database if DATABASE_URL is set
    if (process.env.DATABASE_URL) {
      console.log("🔌 Initializing database connection pool...");
      initializePool();
      
      const dbConnected = await checkDatabaseConnection();
      if (!dbConnected) {
        console.warn("⚠️  Database connection failed. Running in fallback mode (in-memory tokens).");
      }
    } else {
      console.log("⚠️  DATABASE_URL not set. Running in memory-only mode.");
    }

    app.listen(port, () => {
      console.log(`✅ Backend listening on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
