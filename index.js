const cors = require("cors");
const express = require("express");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("./src/auth");
const { config } = require("dotenv");
config();

const SECRET_KEY = process.env.SECRET_KEY;

const app = express();
const port = 8000;

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "admin",
  database: "penpal",
});

db.connect((err) => {
  if (err) {
    console.error("❌ Failed to connect to DB:", err);
    return;
  }
  console.log("✅ Connected to the MySQL database.");
});

app.post("/register", (req, res) => {
  const { fullname, email, password } = req.body;

  if (!fullname || !email || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const query =
    "INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)";
  db.query(query, [fullname, email, password], (err, result) => {
    if (err) {
      console.error("❌ Error inserting user:", err);
      return res.status(500).json({ error: "Failed to add user." });
    }

    res.status(201).json({
      message: "✅ User registered successfully.",
      userId: result.insertId,
    });
  });
});

// 🔐 Login Route
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const query = "SELECT * FROM users WHERE email = ? AND password = ?";
  db.query(query, [email, password], (err, results) => {
    if (err) {
      console.error("❌ Database error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const user = results[0];
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
      expiresIn: "1h",
    });

    res.status(200).json({
      message: "✅ Login successful.",
      token,
      user: { id: user.id, email: user.email },
    });
  });
});

app.get("/me", authenticateToken, (req, res) => {
  const userId = req.user.id;

  const query = "SELECT id, fullname, email FROM users WHERE id = ?";
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching user:", err);
      return res.status(500).json({ error: "Internal error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(results[0]);
  });
});

// 🔍 Public Route
app.get("/users", (req, res) => {
  db.query("SELECT * FROM users", (err, results) => {
    if (err) {
      console.error("❌ Error reading users table:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
    res.json(results);
  });
});

// Create a story
app.post("/stories", authenticateToken, (req, res) => {
  const { title, content, author } = req.body;
  const sql = "INSERT INTO stories (title, content, author) VALUES (?, ?, ?)";
  db.query(sql, [title, content, author], (err, result) => {
    if (err) return res.status(500).json({ error: "Error creating story" });
    res.send({ message: "Story created ✨", id: result.insertId });
  });
});

app.put("/stories/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const sql = "UPDATE stories SET title = ?, content = ? WHERE id = ?";
  db.query(sql, [title, content, id], (err, result) => {
    if (err) return res.status(500).json({ error: "Error updating story" });
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Story not found" });
    res.json({ message: "Story updated successfully" });
  });
});

app.delete("/stories/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM stories WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: "Error deleting story" });
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Story not found" });
    res.json({ message: "Story deleted successfully" });
  });
});

// Get all stories
app.get("/stories", (req, res) => {
  db.query("SELECT * FROM stories", (err, results) => {
    if (err) return res.status(500).json({ error: "Error fetching stories" });
    res.send(results);
  });
});

app.get("/stories/:id", (req, res) => {
  const { id } = req.params;
  console.log("Fetching story with ID:", id);
  db.query("SELECT * FROM stories WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).send("Error fetching story");
    if (results.length === 0)
      return res.status(404).json({ error: "Story not found" });
    res.send(results[0]);
  });
});

app.get("/stories/user/:email", (req, res) => {
  const { email } = req.params;
  console.log("Fetching stories for User Email:", email);
  db.query(
    "SELECT * FROM stories WHERE author = ?",
    [email],
    (err, results) => {
      if (err) return res.status(500).send("Error fetching stories");
      if (results.length === 0)
        return res
          .status(404)
          .json({ error: "No stories found for this user" });
      res.send(results);
    }
  );
});

app.get("/comments/:id", (req, res) => {
  const { id } = req.params;
  console.log("Fetching comments for story ID:", id);
  db.query(
    "SELECT * FROM comments WHERE story_id = ?",
    [id],
    (err, results) => {
      if (err) return res.status(500).send("Error fetching comments");
      res.send(results);
    }
  );
});

app.post("/comments/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { user_name, user_email, comment_content } = req.body;

  if (!user_name || !user_email || !comment_content) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const query =
    "INSERT INTO comments (story_id, user_name, user_email, comment_content) VALUES (?, ?, ?, ?)";
  db.query(
    query,
    [id, user_name, user_email, comment_content],
    (err, result) => {
      if (err) {
        console.error("❌ Error inserting comment:", err);
        return res.status(500).json({ error: "Failed to add comment." });
      }

      res.status(201).json({
        message: "✅ Comment added successfully.",
        commentId: result.insertId,
      });
    }
  );
});

app.delete("/comments/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM comments WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).send("Error deleting comment");
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Comment not found" });
    res.send("Comment deleted successfully");
  });
});

app.get("/collaborators/:id", (req, res) => {
  const { id } = req.params;
  console.log("Fetching collaborators for story ID:", id);
  db.query(
    "SELECT * FROM collaborators WHERE story_id = ?",
    [id],
    (err, results) => {
      if (err) return res.status(500).send("Error fetching collaborators");
      res.send(results);
    }
  );
});

app.post("/collaborators/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { collaborators } = req.body;

  if (!Array.isArray(collaborators) || collaborators.length === 0) {
    return res.status(400).json({ error: "Collaborators array is required." });
  }

  // Now just map directly because it's an array of strings (emails)
  const values = collaborators.map((email) => [id, email]);

  console.log("Inserting collaborators:", values);

  const query = "INSERT INTO collaborators (story_id, email) VALUES ?";

  db.query(query, [values], (err, result) => {
    if (err) {
      console.error("❌ Error inserting collaborators:", err);
      return res.status(500).json({ error: "Failed to add collaborators." });
    }

    res.status(201).json({
      message: "✅ Collaborators added successfully.",
      affectedRows: result.affectedRows,
    });
  });
});

app.get("/user/:email", authenticateToken, (req, res) => {
  const { email } = req.params;
  console.log("Fetching user with email:", email);
  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).send("Error fetching user");
    if (results.length === 0)
      return res.status(404).json({ error: "User not found" });
    res.send(results[0]);
  });
});

// 🌐 Server Start
app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});
