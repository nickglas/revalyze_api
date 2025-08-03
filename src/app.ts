// src/app.ts
import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import "reflect-metadata";

//load env
dotenv.config();

//routes
import authRoutes from "./routes/auth.routes";
import companyRoutes from "./routes/company.routes";
import subscriptionAdminRoutes from "./routes/subscription.admin.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import criteriaRoutes from "./routes/criteria.routes";
import reviewConfigRoutes from "./routes/review.config.routes";
import externalCompanyRoutes from "./routes/external.company.routes";
import contactRoutes from "./routes/contact.routes";
import userRoutes from "./routes/user.routes";
import transcriptRoutes from "./routes/transcript.routes";
import reviewRoutes from "./routes/review.routes";
import insightRoutes from "./routes/insight.route";
import resetTokenRoutes from "./routes/reset.token.routes";

import webhookRoutes from "./routes/webhook.routes";

//middlware
import { errorHandler } from "./middlewares/error.middleware";

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ["http://188.245.185.40:30080/"]
    : ["*"];

const app = express();

// Use raw body parser for webhook route ONLY
app.use(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  webhookRoutes
);

app.use(
  cors({
    origin: function (origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Middleware
app.use(express.json());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Health check
app.get("/", (_req, res) => {
  res.json({
    message: "Revalyze API is live!",
    commit: process.env.RUN_ID || "unknown",
    buildNumber: process.env.RUN_NUMBER || "unknown",
    attempt: process.env.RUN_ATTEMPT || "unknown",
  });
});

// Add your routes here
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/companies", companyRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/v1/criteria", criteriaRoutes);
app.use("/api/v1/review-configs", reviewConfigRoutes);
app.use("/api/v1/external-companies", externalCompanyRoutes);
app.use("/api/v1/contacts", contactRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/transcripts", transcriptRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/insights", insightRoutes);
app.use("/api/v1/reset-tokens", resetTokenRoutes);

// Admin routes
app.use("/api/v1/admin/subscriptions", subscriptionAdminRoutes);

app.use(errorHandler);

export default app;
