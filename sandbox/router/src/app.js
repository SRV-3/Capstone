import express from "express";
import morgan from "morgan";
import http from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createProxyServer } from "httpxy";

const app = express();

app.use(morgan("combined"));

const wsProxy = createProxyServer({ changeOrigin: true });
wsProxy.on("error", (err, req, socket) => {
  socket?.destroy();
});

app.get("/api/status/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/status/readyz", (req, res) => {
  res.status(200).json({ status: "ready" });
});

const proxies = {};
const agentProxies = {};

function getProxy(sandboxId) {
  const target = `http://sandbox-service-${sandboxId}`;
  if (!proxies[sandboxId]) {
    proxies[sandboxId] = createProxyMiddleware({
      target,
      changeOrigin: true,
    });
  }
  return proxies[sandboxId];
}

function getAgentProxy(sandboxId) {
  const target = `http://sandbox-service-${sandboxId}:3000`;
  if (!agentProxies[sandboxId]) {
    agentProxies[sandboxId] = createProxyMiddleware({
      target,
      changeOrigin: true,
    });
  }
  return agentProxies[sandboxId];
}

app.use((req, res, next) => {
  const host = req.headers.host;
  const sandboxId = host.split(".")[0];

  if (host.split(".")[1] === "agent") {
    return getAgentProxy(sandboxId)(req, res, next);
  } else if (host.split(".")[1] === "preview") {
    return getProxy(sandboxId)(req, res, next);
  }
});

const server = http.createServer(app);

server.on("upgrade", (req, socket, head) => {
  const host = req.headers.host;
  const sandboxId = host.split(".")[0];
  const type = host.split(".")[1];

  console.log(`ws upgrade request: ${sandboxId}, type:${type}`);
  socket.on("error", () => socket.destroy()); // guard against EPIPE during live pipe
  if (type === "agent") {
    wsProxy.ws(req, socket, { target: `http://sandbox-service-${sandboxId}:3000` }, head).catch(() => socket.destroy());
  } else if (type === "preview") {
    wsProxy.ws(req, socket, { target: `http://sandbox-service-${sandboxId}` }, head).catch(() => socket.destroy());
  } else {
    socket.destroy();
  }
});

export default app;
