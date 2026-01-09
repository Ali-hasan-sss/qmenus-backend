module.exports = {
  apps: [
    {
      name: "jobs-service",
      script: "dist/src/index.js",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
      cwd: __dirname,
    },
  ],
};
