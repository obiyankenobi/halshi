// pm2 configuration — see DEPLOYMENT.md.
// Runs the Next.js production server directly (not via npm) so pm2 gets
// proper signal handling and restart behavior.
module.exports = {
  apps: [
    {
      name: 'halshi',
      cwd: __dirname,
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
