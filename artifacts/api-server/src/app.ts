import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const mediaRoot = path.resolve(
  process.env.MEDIA_ROOT ?? path.resolve(process.cwd(), "media"),
);
const webDistDir = path.resolve(
  process.env.WEB_DIST_DIR ??
    path.resolve(process.cwd(), "artifacts/cypher-stream/dist/public"),
);

if (fs.existsSync(mediaRoot)) {
  app.use(
    "/media",
    express.static(mediaRoot, {
      acceptRanges: true,
      maxAge: "1h",
      fallthrough: true,
    }),
  );
}

if (fs.existsSync(webDistDir)) {
  app.use(express.static(webDistDir, { index: "index.html" }));

  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api/") || req.path.startsWith("/media/")) {
      return next();
    }
    res.sendFile(path.join(webDistDir, "index.html"));
  });
}

export default app;
