export type Inputs = { x: number; y: number }

export class PlayerController {
  inputs: Inputs = { x: 0, y: 0 }

  constructor() {
    window.addEventListener("keydown", (e) => this.update(e, 1))
    window.addEventListener("keyup", (e) => this.update(e, 0))
  }

  update(e: KeyboardEvent, v: number): void {
    const set = (args: Partial<Inputs>) => (this.inputs = { ...this.inputs, ...args })
    if (e.key === "ArrowLeft") set({ x: -1 * v })
    if (e.key === "ArrowRight") set({ x: 1 * v })
    if (e.key === "ArrowDown") set({ y: -1 * v })
    if (e.key === "ArrowUp") set({ y: 1 * v })
  }
}
