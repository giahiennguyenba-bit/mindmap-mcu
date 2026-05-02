import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/chat': ['./.context/mindy_protocol.md'],
  },
};

export default nextConfig;
