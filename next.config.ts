import type { NextConfig } from "next";

// Cache Components foi desativado de propósito: o sistema é interno,
// autenticado e quase todas as telas dependem da sessão e de dados vivos.
// Ver docs/ARQUITETURA.md (seção "Renderização e cache").
const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
