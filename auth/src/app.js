import "dotenv/config";
import express from "express";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import cookies from "cookie-parser";

//routes
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(morgan("dev"));
app.use(cookies());
app.use(passport.initialize());

(passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    },
  ),
),
  //routes
  app.get("/status/healthz", (req, res) => {
    res.status(200).json({ status: "ok" });
  }));
app.get("/status/readyz", (req, res) => {
  res.status(200).json({ status: "ok" });
});
app.use("/api/auth", authRoutes);

export default app;
