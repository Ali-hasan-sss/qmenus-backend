module.exports = {
  apps: [
    {
      name: "api-service",
      script: "./api-service/dist/api-service/src/app.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: process.env.API_PORT || "5000",
      },
      cwd: __dirname,
      error_file: "./api-service/logs/api-error.log",
      out_file: "./api-service/logs/api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      // Log rotation settings
      max_size: "10M", // Rotate when log file reaches 10MB
      retain: 7, // Keep 7 rotated log files
      compress: true, // Compress rotated logs
    },
    {
      name: "socket-service",
      script: "./socket-service/dist/socket-service/src/socketServer.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: process.env.SOCKET_PORT || "5001",
        SOCKET_PORT: process.env.SOCKET_PORT || "5001",
      },
      cwd: __dirname,
      error_file: "./socket-service/logs/socket-error.log",
      out_file: "./socket-service/logs/socket-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      // Log rotation settings
      max_size: "10M", // Rotate when log file reaches 10MB
      retain: 7, // Keep 7 rotated log files
      compress: true, // Compress rotated logs
    },
    {
      name: "jobs-service",
      script: "./jobs-service/dist/jobs-service/src/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: process.env.JOBS_PORT || "5002",
        JOBS_PORT: process.env.JOBS_PORT || "5002",
      },
      cwd: __dirname,
      error_file: "./jobs-service/logs/jobs-error.log",
      out_file: "./jobs-service/logs/jobs-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      // Log rotation settings
      max_size: "10M", // Rotate when log file reaches 10MB
      retain: 7, // Keep 7 rotated log files
      compress: true, // Compress rotated logs
    },
  ],
};
