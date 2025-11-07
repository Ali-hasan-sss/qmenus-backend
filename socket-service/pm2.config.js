module.exports = {
  apps: [
    {
      name: "socket-service",
      script: "dist/backend/socket-service/src/socketServer.js",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
      cwd: __dirname,
    },
  ],
};
