import type { Plugin, UserConfig } from "vite";
import { existsSync, mkdir, writeFileSync } from "node:fs";
import path from "node:path";
import autoprefixer from "autoprefixer";
import foundryvttSync from "foundryvtt-sync/vite";
import postcssPresetEnv from "postcss-preset-env";
import { defineConfig } from "vite";
import systemJSON from "./system.json" with { type: "json" };
import { transformEntry } from "./scripts/transformer.mjs";

// import tailwindcss from "@tailwindcss/vite";
// import PrefixWrap from "postcss-prefixwrap";
// import PostCSSReplace from "postcss-replace";

const systemPath = `systems/${systemJSON.id}`;
// const cssId = systemJSON.flags.css.id;

const entry = "warden.mjs";
const postcss = {
	inject: false,
	sourceMap: true,
	extensions: [".css"],
	plugins: [
		autoprefixer,
		postcssPresetEnv,
		/*
			// Tailwind Encapsulation
			PrefixWrap(`.${cssId}`, {
				ignoredSelectors: [`.${cssId}`],
				blacklist: ["globals.css"],
				nested: "&",
			}),
			PostCSSReplace({
				pattern: /\{\{\s?(\S+?)\s?\}\}/g,
				commentsOnly: false,
				data: {
					compendium: `${systemJSON.id}.${systemJSON.packs[0].name}`,
				},
			}),
		*/
	],
};

export default defineConfig(({ mode: _mode }) => {
	return {
		root: "src/", // Source location / esbuild root.
		base: `/${systemPath}/dist`, // Base system path that 30001 / served dev directory.
		publicDir: false, // No public resources to copy.
		cacheDir: ".vite-cache", // Relative from root directory.

		resolve: {
			conditions: ["browser", "import"],
			alias: {
				$lib: path.resolve(__dirname, "./src/lib"),
				systemJSON: path.resolve(__dirname, "./system.json"),
			},
		},

		esbuild: {
			target: ["es2022"],
		},

		css: { postcss },

		server: {
			port: 30001,
			open: "/join",
			proxy: {
				// Serves static files from main Foundry server.
				[`^(/${systemPath}/(assets|lang|packs))`]: "http://localhost:30000",

				// All other paths besides package ID path are served from main Foundry server.
				[`^(?!/${systemPath}/)`]: "http://localhost:30000",

				// Rewrite incoming `system-id.js` request from Foundry to the dev server `index.ts`.
				[`/${systemPath}/dist/${systemJSON.id}.js`]: {
					target: `http://localhost:30001/${systemPath}/dist`,
					rewrite: () => `/${entry}`,
				},

				// Enable socket.io from main Foundry server.
				"/socket.io": { target: "ws://localhost:30000", ws: true },
			},
		},
		build: {
			outDir: "../dist",
			emptyOutDir: false,
			sourcemap: true,
			minify: "terser",
			target: ["es2020"],
			terserOptions: {
				compress: {
					passes: 3,
				},
				mangle: {
					toplevel: true,
					keep_classnames: true,
					keep_fnames: true,
				},
				module: true,
				ecma: 2020,
			},
			lib: {
				entry,
				formats: ["es"],
				fileName: systemJSON.id,
			},
			rollupOptions: {
				output: {
					// Rewrite the default style.css to a more recognizable file name.
					assetFileNames: assetInfo =>
						assetInfo.name === "style.css" ? `${systemJSON.id}.css` : assetInfo.name as string,
				},
			},
		},

		optimizeDeps: {
			esbuildOptions: {
				target: "es2022",
			},
		},

		plugins: [
			// tailwindcss(),
			foundryvttSync(systemJSON, { transformer: transformEntry }) as Plugin[],
			{
				name: "create-dist-files",
				buildStart() {
					if (!existsSync("dist")) {
						mkdir("dist", (err) => {
							if (err) throw err;
						});
					}

					const files = [...systemJSON.esmodules];
					for (const name of files) {
						writeFileSync(name, "", { flag: "a" });
					}
				},
			},
		],
	} satisfies UserConfig;
});
