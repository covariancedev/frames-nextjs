import { withAxiom } from "next-axiom";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "*",
        protocol: "http",
      },
      {
        hostname: "*",
        protocol: "https",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/allow-lists",
        destination:
          "/0d37e616dbcd410e82cdc574309314e2ecabaa4b086447a6b92bbe157c2262ac",
        permanent: true,
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: [
      "@resvg/resvg-js",
      "airtable",
      "@olli/kvdex",
      "@deno/kv",
    ],
    instrumentationHook: true,
  },
  webpack: (config) => {
    config.externals.push({
      sharp: "commonjs sharp",
      "@resvg/resvg-js": "commonjs @resvg/resvg-js",
    });

    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withAxiom(nextConfig);
