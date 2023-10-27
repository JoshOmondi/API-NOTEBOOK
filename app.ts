import express from "express";
import bodyParser from "body-parser";
import sqlite3 from "sqlite3";
import { Database, RunResult } from "sqlite3";

const app = express();
const db = new sqlite3.Database("notes.db");

app.use(bodyParser.json());

// Creating the notes table if it doesn't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      createdAt TEXT
    )
  `);
});

// Create a new note
app.post("/notes", (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }
  const id = generateUUID();
  const createdAt = new Date().toLocaleString();

  const stmt = db.prepare(
    "INSERT INTO notes (id, title, content, createdAt) VALUES (?, ?, ?, ?)"
  );
  stmt.run(id, title, content, createdAt, (err: Error | null) => {
    if (err) {
      return res.status(500).json({ error: "Error creating note" });
    }
    res.status(201).json({ message: "Note created successfully", note_id: id });
  });
  stmt.finalize();
});

// Fetch all notes
app.get("/notes", (req, res) => {
  db.all(
    "SELECT id, title, content, createdAt FROM notes",
    (err: Error | null, rows: any[]) => {
      if (err) {
        return res.status(500).json({ error: "Error fetching notes" });
      }
      res.json(rows);
    }
  );
});

// Get a single note by its ID
app.get("/notes/:note_id", (req, res) => {
  const id = req.params.note_id;
  db.get(
    "SELECT id, title, content, createdAt FROM notes WHERE id = ?",
    [id],
    (err: Error | null, row: any) => {
      if (err) {
        return res.status(500).json({ error: "Error fetching note" });
      }
      if (!row) {
        return res.status(404).json({ error: "Note not found" });
      }
      res.json(row);
    }
  );
});

// Update a note by its ID
app.put("/notes/:note_id", (req, res) => {
  const id = req.params.note_id;
  const { title, content } = req.body;
  if (!title && !content) {
    return res.status(400).json({ error: "Title or content is required" });
  }

  db.run(
    "UPDATE notes SET title = ?, content = ? WHERE id = ?",
    [title, content, id],
    function (err: Error | null) {
      if (err) {
        return res.status(500).json({ error: "Error updating note" });
      }
      if ((this as RunResult).changes === 0) {
        return res.status(404).json({ error: "Note not found" });
      }
      res.json({ message: "Note updated successfully", note_id: id });
    }
  );
});

// Delete a note by its ID
app.delete("/notes/:note_id", (req, res) => {
  const id = req.params.note_id;

  db.run("DELETE FROM notes WHERE id = ?", [id], function (err: Error | null) {
    if (err) {
      return res.status(500).json({ error: "Error deleting note" });
    }
    if ((this as RunResult).changes === 0) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.json({ message: "Note deleted successfully" });
  });
});

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const port = process.env.PORT || 4500;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
