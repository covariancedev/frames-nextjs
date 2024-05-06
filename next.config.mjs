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
    experimental: {
      serverComponentsExternalPackages: ["@resvg/resvg-js", "airtable","@olli/kvdex","@deno/kv"],
    },
    webpack: (config) => {
      config.externals.push({
        sharp: "commonjs sharp",
        "@resvg/resvg-js": "commonjs @resvg/resvg-js",
      });
  
      return config;
    },
    typescript:{
      ignoreBuildErrors: true,
    }
  };
  
  export default nextConfig;