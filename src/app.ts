// src/app.ts
import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
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

import webhookRoutes from "./routes/webhook.routes";

//middlware
import { errorHandler } from "./middlewares/error.middleware";

const app = express();

// Use raw body parser for webhook route ONLY
app.use(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  webhookRoutes
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
app.use("/api/v1/exteral-companies", externalCompanyRoutes);
app.use("/api/v1/contacts", contactRoutes);
app.use("/api/v1/users", userRoutes);

// Admin routes
app.use("/api/v1/admin/subscriptions", subscriptionAdminRoutes);

app.use(errorHandler);

export default app;
