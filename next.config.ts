import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libSQL ships Node-specific transports and non-code package files; leave it
  // external so Turbopack/Next doesn't try to parse the package LICENSE as JS.
  serverExternalPackages: ["@libsql/client"],

  // На хостингах вроде Amvera в продакшене ставятся только dependencies,
  // поэтому сборка не должна зависеть от eslint. Линт и типы гоняем локально
  // через `npm run check`.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  experimental: { cpus: 1 },
};

export default nextConfig;
