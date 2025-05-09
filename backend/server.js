const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const PORT = 3000;

// PostgreSQL setup
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "antenna_predictor",
  password: "Parthuchem#0203",
  port: 5432,
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: "antenna-secret",
  resave: false,
  saveUninitialized: false
}));
app.use(express.static(path.join(__dirname, "../frontend")));

function isAuthenticated(req, res, next) {
  if (req.session.user) next();
  else res.status(401).json({ message: "Unauthorized" });
}

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query("INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id", [username, hashed]);
    res.status(200).json({ message: "Registered" });
  } catch (err) {
    res.status(400).json({ message: "Username may already exist." });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (result.rows.length > 0) {
      const match = await bcrypt.compare(password, result.rows[0].password);
      if (match) {
        req.session.user = { id: result.rows[0].id, username };
        return res.json({ message: "Login successful" });
      }
    }
    res.status(401).json({ message: "Invalid credentials" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.status(200).json({ message: "Logged out" });
});

app.post("/api/predict", isAuthenticated, async (req, res) => {
  const inputData = req.body;
  const userId = req.session.user.id;
  const python = spawn("python", ["../python-model/predict.py"]);
  python.stdin.write(JSON.stringify(inputData));
  python.stdin.end();

  let result = "";
  python.stdout.on("data", (data) => {
    result += data.toString();
  });

  python.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  python.on("close", async (code) => {
    try {
      const output = JSON.parse(result);
      const {
        Length_mm, Width_mm, Height_mm, Epsilon_r, Operating_Frequency_GHz,
        Antenna_Type, Aspect_Ratio, Volume_mm3, Feed_Ratio, Electrical_Length,
        S11_dB, Bandwidth_GHz, Traffic_Capacity_Mbps
      } = inputData;

      const query = `
        INSERT INTO predictions (
          length_mm, width_mm, height_mm, epsilon_r, operating_frequency_ghz,
          antenna_type, aspect_ratio, volume_mm3, feed_ratio, electrical_length,
          s11_db, bandwidth_ghz, traffic_capacity_mbps,
          predicted_gain, predicted_efficiency, predicted_cost, user_id
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13,
          $14, $15, $16, $17
        )`;

      const values = [
        Length_mm, Width_mm, Height_mm, Epsilon_r, Operating_Frequency_GHz,
        Antenna_Type, Aspect_Ratio, Volume_mm3, Feed_Ratio, Electrical_Length,
        S11_dB, Bandwidth_GHz, Traffic_Capacity_Mbps,
        output.Gain, output.Efficiency_Percentage, output.Cost, userId
      ];

      await pool.query(query, values);
      res.json(output);
    } catch (err) {
      console.error("Error parsing prediction result or inserting into DB:", err);
      res.status(500).json({ message: "Prediction failed" });
    }
  });
});

app.get("/api/user-data", isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;
  const result = await pool.query("SELECT * FROM predictions WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
  res.json(result.rows);
});

// Route fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
