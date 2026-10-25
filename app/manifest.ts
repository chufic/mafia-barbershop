import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Барбершоп «Мафия» — Тюмень",
    short_name: "Мафия",
    description:
      "Мужские стрижки, борода и бритьё на Широтной, 124 в Тюмени. Ежедневно с 10:00 до 21:00.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    lang: "ru",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
