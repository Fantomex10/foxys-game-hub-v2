import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Environment variable validation
function validateEnvironment() {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for required environment variables
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }

  // Check for recommended environment variables
  if (!process.env.SESSION_SECRET) {
    warnings.push('SESSION_SECRET is not set - using generated fallback (not recommended for production)');
    // Generate a fallback SESSION_SECRET for development/demo purposes
    process.env.SESSION_SECRET = `fallback-secret-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  if (warnings.length > 0) {
    warnings.forEach(warning => log(`⚠️  WARNING: ${warning}`));
  }

  if (errors.length > 0) {
    errors.forEach(error => log(`❌ ERROR: ${error}`));
    throw new Error(`Environment validation failed: ${errors.join(', ')}`);
  }

  log('✅ Environment variables validated');
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Validate environment variables before starting
    validateEnvironment();
    
    const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log the error for debugging
    log(`❌ Error ${status}: ${message}`);
    if (err.stack && process.env.NODE_ENV === 'development') {
      console.error(err.stack);
    }

    res.status(status).json({ message });
    // Don't re-throw the error to prevent crashes
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`🚀 Server successfully started on port ${port}`);
    log(`🌐 Health check available at http://localhost:${port}/api/health`);
  });

  // Handle server startup errors
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      log(`❌ Port ${port} is already in use`);
    } else {
      log(`❌ Server error: ${error.message}`);
    }
    process.exit(1);
  });

  } catch (error: any) {
    log(`❌ Failed to start server: ${error.message}`);
    if (error.stack && process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  }
})().catch((error) => {
  log(`❌ Unhandled startup error: ${error.message}`);
  process.exit(1);
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  log(`❌ Uncaught Exception: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});
