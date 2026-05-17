import express from "express";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

app.use(morgan("combined"));

app.get("/api/status/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/status/readyz", (req, res) => {
  res.status(200).json({ status: "ready" });
});

app.use((req, res, next) => {
  const host = req.headers.host;
  const sandboxId = host.split(".")[0];

  const target = `http://sandbox-service-${sandboxId}`;

  createProxyMiddleware({
    target,
    changeOrigin: true,
    ws: true,
  })(req, res, next);
});

export default app;
