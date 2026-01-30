import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Ignore the packages directory (original node-fhir-server library)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don't type-check packages directory
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
