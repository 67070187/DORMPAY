import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // สำหรับ Docker image ขนาดเล็ก
};

export default nextConfig;
