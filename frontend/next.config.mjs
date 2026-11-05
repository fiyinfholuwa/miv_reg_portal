/** @type {import('next').NextConfig} */
const nextConfig = {
  // The API address is used in the browser, so it is inlined at build time.
  // Set API_URL in .env locally and in the hosting provider before building.
  env: {
    API_URL: process.env.API_URL ?? '',
  },
};

export default nextConfig;
