/**
 * Mounting for the browser specs: a template in the document, or in a
 * LitElement's shadow root. Everything mounted is removed after each test.
 */
import { css, type CSSResultGroup, LitElement, render, type TemplateResult } from "lit";

const mounted: Array<Element> = [];

afterEach(() => {
  mounted.splice(0).forEach(element => element.remove());
});

/** Renders a template into a container in the document, with Lit's own `render`. */
export function mountInDocument(template: TemplateResult): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  mounted.push(container);
  render(template, container);
  return container;
}

/** A mounted LitElement that renders the given template into its shadow root. */
export type TestHost = LitElement & { shadowRoot: ShadowRoot };

let elements = 0;

/**
 * Defines a LitElement whose `render()` calls `template`, with `styles`
 * (if any) as its `static styles` after `:host { display: block }`.
 */
export function defineHost(template: () => unknown, styles?: CSSResultGroup): string {
  const tag = `test-host-${++elements}`;
  customElements.define(
    tag,
    class extends LitElement {
      static override styles = [
        css`
          :host {
            display: block;
          }
        `,
        styles ?? [],
      ];
      override render() {
        return template();
      }
    },
  );
  return tag;
}

/** Creates an element and mounts it in the document, inside `wrapper` if given. */
export async function mountElement(tag: string, wrapper?: HTMLElement): Promise<TestHost> {
  const host = document.createElement(tag) as TestHost;
  const outermost = wrapper ?? host;
  wrapper?.append(host);
  document.body.append(outermost);
  mounted.push(outermost);
  await host.updateComplete;
  await settle();
  return host;
}

/** Mounts a LitElement that renders `template` into its shadow root. */
export function mountInShadowRoot(
  template: () => unknown,
  styles?: CSSResultGroup,
): Promise<TestHost> {
  return mountElement(defineHost(template, styles));
}

/** Re-renders a mounted host and waits until its grids have caught up. */
export async function rerender(host: TestHost): Promise<void> {
  host.requestUpdate();
  await host.updateComplete;
  await settle();
}

/** Waits until work deferred past the current render has run. */
export function settle(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve));
}
