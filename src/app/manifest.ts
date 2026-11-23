import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quiz Companion",
    short_name: "Revision",
    description: "Live Class Quiz Companion & Spaced-Repetition Revision Cards",
    start_url: "/revision",
    display: "standalone",
    background_color: "#030712",
    theme_color: "#7c3aed",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
