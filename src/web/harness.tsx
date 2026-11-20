/** @jsxImportSource @solidjs/web */
/** A part of the page drawn with the fixture's events: as text to read, or mounted to act on. */
import { delegateEvents, render as draw, type JSX } from "@solidjs/web"
import { flush } from "solid-js"
import type { Events, Me } from "../shared/events"
import type { LogBatch } from "../shared/log-events"
import { type Actions, EstateContext } from "./context"
import { mounted } from "./dom"
import { events, heard, now, operator } from "./fixture"
import type { Live } from "./live"
import { recording } from "./recording"
import type { Page } from "./route"

interface Options {
  readonly page?: Page
  readonly me?: Me
  readonly sent?: Partial<Events>
  readonly actions?: Actions
  readonly live?: Live
}

const within = (node: () => JSX.Element, options: Options, actions: Actions) => () => (
  <EstateContext
    value={{
      live: options.live ?? heard(options.sent ?? events),
      me: options.me ?? operator,
      page: () => options.page ?? { page: "overview" },
      actions,
      now: () => now,
    }}
  >
    {node()}
  </EstateContext>
)

/** The part's markup once drawn. */
export const render = (node: () => JSX.Element, options: Options = {}): string => {
  const container = document.createElement("div")
  const dispose = draw(within(node, options, options.actions ?? recording().actions), container)
  flush()
  const html = container.innerHTML
  dispose()
  return html
}

/** An event dispatched as a person's would be, with what it changed applied before the test reads the page. */
export const fire = (target: EventTarget, event: Event) => {
  const done = target.dispatchEvent(event)
  flush()
  return done
}

/** The part left on the page, with what its actions were asked, and ways to click and type into it. */
// Solid listens for these on the document as its modules load; a test file's fresh document needs them again.
const delegated = ["click", "input", "keydown", "pointermove", "pointerdown", "pointerup", "submit", "change"]

export const mount = (node: () => JSX.Element, options: Options = {}) => {
  delegateEvents(delegated)
  const recorded = recording()
  const container = document.createElement("div")
  document.body.append(container)
  const drawn = draw(within(node, options, options.actions ?? recorded.actions), container)
  const dispose = () => {
    mounted.delete(dispose)
    drawn()
  }
  mounted.add(dispose)
  // Solid applies what changed a microtask later; a test reads the page at once, so what it did is applied now.
  flush()
  /** The button named `name`, or the `nth` of several so named, in the order they are on the page. */
  const button = (name: string | RegExp, nth = 0) => {
    const found = [...container.querySelectorAll("button")].filter((each) =>
      typeof name === "string" ? each.textContent?.trim() === name : name.test(each.textContent ?? ""),
    )[nth]
    if (found === undefined) throw new Error(`no button ${name} in ${container.textContent}`)
    return found
  }
  const click = (element: HTMLElement, init: MouseEventInit = {}) =>
    fire(element, new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init }))
  const type = (element: HTMLInputElement | HTMLSelectElement, value: string) => {
    element.value = value
    fire(element, new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }))
  }
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0)).then(flush)
  const sendLines = (batch: LogBatch) => {
    recorded.sendLines(batch)
    flush()
  }
  return { container, calls: recorded.calls, sendLines, button, click, type, settle, dispose }
}
