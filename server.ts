import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DATA_FILE = path.join(process.cwd(), "tasks_db.json");

  app.use(express.json());

  // Helper to read tasks from file
  async function readTasks() {
    try {
      const data = await fs.readFile(DATA_FILE, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  // Helper to save tasks to file
  async function saveTasks(tasks: any[]) {
    await fs.writeFile(DATA_FILE, JSON.stringify(tasks, null, 2), "utf-8");
  }

  // API: Get all tasks
  app.get("/api/tasks", async (req, res) => {
    const tasks = await readTasks();
    res.json(tasks);
  });

  // API: Save all tasks
  app.post("/api/tasks", async (req, res) => {
    const tasks = req.body;
    if (Array.isArray(tasks)) {
      await saveTasks(tasks);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Invalid data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
