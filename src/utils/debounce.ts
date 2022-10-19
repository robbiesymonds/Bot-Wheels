// eslint-disable-next-line no-unused-vars
export function debounce<F extends (...params: unknown[]) => void>(fn: F, delay: number) {
  let timeout: NodeJS.Timeout
  return function (this: unknown, ...args: unknown[]) {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn.apply(this, args), delay)
  } as F
}
