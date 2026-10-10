module.exports = {
  apps: [
    {
      name: "antikeri-absensi",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3289",
      cwd: "./",
      instances: "max", // atau 1 bila server kecil (1-2 vCPU)
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3289,
      },
    },
  ],
};
