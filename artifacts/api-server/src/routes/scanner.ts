import { Router, type IRouter } from "express";
import { execFile } from "node:child_process";
import path from "node:path";

const router: IRouter = Router();

router.post("/admin/scan", (_req, res) => {
  const script = path.resolve(process.cwd(), "scripts/scan-media.mjs");

  execFile(process.execPath, [script], {
    env: process.env,
    timeout: 15 * 60 * 1000,
    maxBuffer: 2 * 1024 * 1024,
  }, (error, stdout, stderr) => {
    if (stdout) console.log(stdout.trim());
    if (stderr) console.warn(stderr.trim());

    if (error) {
      res.status(500).json({
        ok: false,
        error: "Media scan failed",
        details: stderr.trim() || error.message,
      });
      return;
    }

    res.json({
      ok: true,
      output: stdout.trim(),
    });
  });
});

export default router;
