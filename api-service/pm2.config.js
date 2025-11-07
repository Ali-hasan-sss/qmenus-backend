module.exports = {
  apps: [
    {
      name: "api-service",
      script: "dist/backend/api-service/src/app.js",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
      cwd: __dirname,
    },
  ],
};
