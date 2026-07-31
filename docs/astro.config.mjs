// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
  // `site` intentionally unset for now — set it when the deploy target is known.
  integrations: [
    starlight({
      title: "patterson",
      description:
        "One command. Every agent configured. Zero drift. Template-driven scaffolder and standing configuration manager for the AI-assisted development lifecycle.",
      logo: {
        light: "./src/assets/patterson-logo-navy.svg",
        dark: "./src/assets/patterson-logo-white.svg",
        replacesTitle: true,
      },
      customCss: ["./src/styles/patterson.css"],
      sidebar: [
        {
          label: "Start",
          items: [{ autogenerate: { directory: "start" } }],
        },
        {
          label: "Concepts",
          items: [{ autogenerate: { directory: "concepts" } }],
        },
        {
          label: "Guides",
          items: [{ autogenerate: { directory: "guides" } }],
        },
        {
          label: "Reference",
          items: [{ autogenerate: { directory: "reference" } }],
        },
        {
          label: "Contributing",
          items: [{ autogenerate: { directory: "contributing" } }],
        },
      ],
    }),
  ],
});
