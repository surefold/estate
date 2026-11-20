/**
 * Solid's compiler as a Bun plugin: the pages' `.tsx` are compiled by `@solidjs/babel-plugin`, since Bun's own JSX
 * transform is React's. The server's bundle uses it, and so do the pages' tests.
 */
import { transformAsync } from "@babel/core"
import typescript from "@babel/preset-typescript"
import solid from "@solidjs/babel-plugin"
import type { BunPlugin } from "bun"

/** A `.tsx` as Solid compiles it for the bundle; the pages' tests read it too. */
export const compile = (path: string, source: string): Promise<string> =>
  transformAsync(source, {
    filename: path,
    plugins: [[solid, { generate: "dom" }]],
    presets: [[typescript, { onlyRemoveTypeImports: true }]],
    sourceMaps: "inline",
    configFile: false,
    babelrc: false,
  }).then((result) => result?.code ?? "")

const pages = /src\/web\/.*\.tsx$/

export const solidPlugin: BunPlugin = {
  name: "solid",
  setup: (build) => {
    build.onLoad({ filter: pages }, ({ path }) =>
      Bun.file(path)
        .text()
        .then((source) => compile(path, source))
        .then((contents) => ({ contents, loader: "js" as const })),
    )
  },
}

/**
 * For `bun test`, which resolves Solid to its server build: every import of Solid, in the pages and in Solid itself,
 * is pointed at the browser build instead, so the pages and their tests share one Solid.
 */
const root = `${process.cwd()}/node_modules`
const builds: ReadonlyArray<readonly [RegExp, string]> = [
  [/from\s*["']solid-js["']/g, `from "${root}/solid-js/dist/solid.js"`],
  [/from\s*["']@solidjs\/web["']/g, `from "${root}/@solidjs/web/dist/web.js"`],
]
const toBrowser = (code: string): string =>
  builds.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), code)

export const solidInBrowser = {
  plugin: {
    name: "solid-in-browser",
    setup: (build) => {
      build.onLoad({ filter: pages }, ({ path }) =>
        Bun.file(path)
          .text()
          .then((source) => compile(path, source))
          .then((contents) => ({ contents: toBrowser(contents), loader: "js" as const })),
      )
      build.onLoad({ filter: /src\/web\/.*[^x]\.ts$/ }, ({ path }) =>
        Bun.file(path)
          .text()
          .then((contents) => ({ contents: toBrowser(contents), loader: "ts" as const })),
      )
      build.onLoad({ filter: /node_modules\/(@solidjs\/web\/dist\/web|solid-js\/dist\/internal)\.js$/ }, ({ path }) =>
        Bun.file(path)
          .text()
          .then((contents) => ({ contents: toBrowser(contents), loader: "js" as const })),
      )
    },
  } satisfies BunPlugin,
}
