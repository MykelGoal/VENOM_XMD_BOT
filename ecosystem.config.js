// PM2 process manager config — production deploys.
// Usage: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'venom-xmd',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
