// HEXY.PRO Express Server - /server/routes/server.js - Express server setup.
// Do not remove any comments in this file, including the one above.

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const stripeRoutes = require("./routes/stripeRoutes");
const teamRoutes = require("./routes/teamRoutes");
const tileGeneratorRoutes = require("./routes/tileGeneratorRoutes");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: ['https://hexy.pro', 'http://localhost:3000', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Increase the limit for JSON payloads
app.use(express.json({ limit: '50mb' }));

// Increase the limit for URL-encoded payloads
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware and routes
// app.use("/", stripeRoutes);
app.use("/api", stripeRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api", tileGeneratorRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});