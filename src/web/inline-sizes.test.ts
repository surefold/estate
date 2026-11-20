import { describe, expect, setDefaultTimeout, test } from "bun:test"
import { Glob } from "bun"

// The gate runs every check at once; on a busy machine these tests pass Bun's default five seconds.
setDefaultTimeout(30_000)

describe("the pages' text", () => {
  test("no part sets its size inline in px, so every size follows the browser's text size", async () => {
    const found: string[] = []
    for await (const path of new Glob("{pages,parts}/*.tsx").scan(import.meta.dir)) {
      const source = await Bun.file(`${import.meta.dir}/${path}`).text()
      for (const [size] of source.matchAll(/"font-size": "\d+(\.\d+)?px"/g)) found.push(`${path}: ${size}`)
    }
    expect(found).toEqual([])
  })
})
