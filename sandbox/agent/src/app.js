import express from "express";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import { Server } from "socket.io";
import http from "http";
import pty from "node-pty";
import os from "os";
import cors from "cors";

const app = express();
const httpServer = http.createServer(app);

app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ methods: ["GET", "POST", "PATCH", "DELETE"], origin: "*" }));

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH"],
  },
});

const WORKING_DIR = "/workspace";

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Hello, from sandbox agent",
    status: "success",
  });
});

const shell = process.env.SHELL || "bash";

//Spwan the PTY process
const ptyProcess = pty.spawn(shell, [], {
  name: "xterm-color",
  cols: 80,
  rows: 30,
  cwd: "/workspace",
  env: process.env,
});

//handle data coming from the PTY (stdout/stderr)
ptyProcess.onData((data) => {
  io.emit("terminal-output", data);
});

ptyProcess.onExit(({ exitCode, signal }) => {
  console.log(`PTY process exited with code: ${exitCode}, signal: ${signal}`);
});

io.on("connection", (socket) => {
  console.log("client connected:" + socket.id);

  socket.on("terminal-input", (data) => {
    ptyProcess.write(data);
  });

  socket.on("disconnect", () => {
    console.log("client disconnected:" + socket.id);
  });
});

/**
 * @router GET /list-files
 * @description List all files in the working directory and its subdirectories. The response will include the file paths relative to the working directory. Exclude directories like node_modules, .git, dist, etc.
 * - eg .{
 *    "files": [
 *      "file1.txt",
 *      "src/file2.txt",
 *     "src/subdir/file3.txt"
 *    ]
 * }
 */
app.get("/list-files", async (req, res) => {
  const listFiles = async (dir, baseDir) => {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      if (entry.isDirectory() && ["node_modules", ".git", "dist"].includes(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        files.push(...(await listFiles(fullPath, baseDir)));
      } else {
        files.push(relativePath);
      }
    }
    return files;
  };

  try {
    const files = await listFiles(WORKING_DIR, WORKING_DIR);
    res.status(200).json({
      message: "Files listed successfully",
      files,
    });
  } catch (err) {
    res.status(500).json({
      message: `Error listing files: ${err.message}`,
      status: "error",
    });
  }
});

/**
 * @router GET /read-files?files=file1.txt&files=file2.txt
 * @description Read the contents of one or more files in the working directory. The `files` query parameter can be provided multiple times to specify multiple files.
 * @response 200 - Success - Returns the contents of the specified files.
 * @response 400 - Bad Request - No files provided.
 */
app.get("/read-files", async (req, res) => {
  const files = req.query.files;

  if (!files) {
    return res.status(400).json({
      message: "No files provided",
      status: "error",
    });
  }

  const fileList = files.split(",");

  const results = await Promise.all(
    fileList.map(async (file) => {
      const filepath = path.join(WORKING_DIR, file);
      try {
        const content = await fs.promises.readFile(filepath, "utf-8");
        return {
          [filepath.replace(WORKING_DIR, "")]: content,
        };
      } catch (error) {
        return {
          [filepath]: `Error reading file: ${error.message}`,
        };
      }
    }),
  );

  res.status(200).json({
    message: "File contents",
    status: "success",
    data: results,
  });
});

/**
 * @router PATCH /update-files
 * @description Update the contents of a files specified in the request body. The request body should contain a property 'updates. with a JSON Array of objects, each object should have a 'file' property specifying the file path (relative to the working directory) and a 'content' property with the new content for the file.
 */
app.patch("/update-files", async (req, res) => {
  const updates = req.body.updates;

  if (!updates || !Array.isArray(updates)) {
    return res.status(400).json({
      message: "Invalid request body. Expected an array of updates.",
      status: "error",
    });
  }

  const result = await Promise.all(
    updates.map(async (update) => {
      const { file, content } = update;
      const filePath = path.join(WORKING_DIR, file);
      try {
        await fs.promises.writeFile(filePath, content, "utf-8");
        return {
          [filePath]: "File updated successfully",
        };
      } catch (error) {
        return {
          [filePath]: `Error updating file: ${error.message}`,
        };
      }
    }),
  );

  res.status(200).json({
    message: "File update results",
    status: "success",
    data: result,
  });
});

/**
 * @route POST /create-files
 * @description create a new files with the content specified in the request body. The request body should contain a property 'files' with a JSON Array of objects, each object should have a 'file' property specifying the file path (relative to the working directory) and a 'content' property with the content for the new file.
 */
app.post("/create-files", async (req, res) => {
  const files = req.body.files;

  if (!files || !Array.isArray(files)) {
    return res.status(400).json({
      message: "Invalid request body. Expected an array of files.",
      status: "error",
    });
  }

  const result = await Promise.all(
    files.map(async (fileObj) => {
      const { file, content } = fileObj;
      const filePath = path.join(WORKING_DIR, file);

      try {
        await fs.promises.mkdir(path.dirname(filePath), {
          recursive: true,
        });
        await fs.promises.writeFile(filePath, content, "utf-8");
        return {
          [filePath]: `File created successfully`,
        };
      } catch (error) {
        return {
          [filePath]: `Error creating file: ${error.message}`,
        };
      }
    }),
  );

  res.status(200).json({
    message: "File creation results",
    status: "success",
    data: result,
  });
});

export default httpServer;
