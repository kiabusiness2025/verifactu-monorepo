const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Point to the monorepo root relative to this app's directory
    // /app/apps/app --> /app
    root: path.join(__dirname, '../../'),
  },
};

module.exports = nextConfig;