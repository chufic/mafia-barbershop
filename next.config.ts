import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libSQL ships Node-specific transports and non-code package files; leave it
  // external so Turbopack/Next doesn't try to parse the package LICENSE as JS.
  serverExternalPackages: ["@libsql/client"],
};

export default nextConfig;
