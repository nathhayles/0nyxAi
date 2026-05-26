import express from "express";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

app.post("/convert", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const input = req.file.path;
  const output = input + ".mp4";

  exec(
    `ffmpeg -y -i ${input} -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k ${output}`,
    (err) => {
      if (err) {
        console.error("FFMPEG ERROR:", err);
        return res.status(500).json({ error: "FFmpeg failed" });
      }

      res.download(output, "video.mp4", () => {
        fs.unlinkSync(input);
        fs.unlinkSync(output);
      });
    }
  );
});

app.listen(3001, () => {
  console.log("Server running on port 3001");
});
app.get("/api/media", (req, res) => {
  res.json([]);
});
