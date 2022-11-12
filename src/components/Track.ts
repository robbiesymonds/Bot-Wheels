import { dist } from "@utils/distance"
import { Line, Point } from "constants/types"

interface TrackConstructor {
  walls: Line[]
  gates: Line[]
}

export class Track {
  private drawing: boolean = false
  private wall_data: Line[] = []
  private gate_data: Line[] = []
  private store: Line[] = []
  private gate_progress: boolean[] = []

  ctx!: CanvasRenderingContext2D
  debug: boolean = true
  walls: Line[] = []
  gates: Line[] = []

  constructor({ walls, gates }: TrackConstructor) {
    this.wall_data = walls
    this.gate_data = gates

    this.gate_progress = Array(gates.length).fill(false)
    this.update()
  }

  /*
   * Resets the gate counter.
   */
  reset(): void {
    this.gate_progress = Array(this.gate_data.length).fill(false)
  }

  /*
   * Calcuates new screen-space coordinates for the track.
   */
  update(): void {
    const c = this.ctx
    if (!c) return

    const cw = c.canvas.width
    const ch = Math.min(cw, c.canvas.height)

    const scale = (l: Line) => {
      const x1 = l[0][0] * cw
      const y1 = l[0][1] * ch
      const x2 = l[1][0] * cw
      const y2 = l[1][1] * ch
      return [
        [x1, y1],
        [x2, y2]
      ] as Line
    }

    this.walls = this.wall_data.map(scale)
    this.gates = this.gate_data.map(scale)
  }

  /*
   * Draws actual collision walls if debug is enabled.
   */
  render(): void {
    const c = this.ctx
    c.lineWidth = 0.001 * c.canvas.width
    c.strokeStyle = "#ffffff"
    const line = (l: Line) => {
      const [[a, b], [x, y]] = l
      c.moveTo(a, b)
      c.lineTo(x, y)
      c.stroke()
    }

    // Debug the actual bounds of the track.
    if (this.debug) {
      this.walls.forEach(line)
      this.gates.forEach(line)
    }

    // Draws the in memory lines if drawing.
    if (this.drawing) this.store.forEach(line)
  }

  /*
   * Returns the distance to the next reward gate.
   */
  nearest(car: Line): { distance: number; angle: number } {
    let distance: number = 9999999
    let angle: number = 0

    this.gates.forEach((g) => {
      const d = dist(car[0], g[0])
      if (d < distance) {
        distance = d

        const mx = g[0][0] + 0.5 * (g[1][0] - g[0][0])
        const my = g[0][1] + 0.5 * (g[1][1] - g[0][1])
        angle = Math.atan2(car[0][1] - my, car[0][0] - mx)
      }
    })
    return { distance, angle }
  }

  /*
   * Determines if the car has crossed through any gates and returns reward.
   */
  reward(car: Line): number {
    let reward: number = -0.1

    this.gates.forEach((g, i) => {
      const [[a, b], [c, d]] = car
      const [[w, x], [y, z]] = g
      const denominator = (z - x) * (c - a) - (y - w) * (d - b)

      // Lines are parallel.
      if (denominator === 0) return

      // The previous gate hasn't been crossed.
      if ((i > 0 && this.gate_progress[i - 1] === false) || this.gate_progress[i] === true) return

      const ua = ((y - w) * (b - x) - (z - x) * (a - w)) / denominator
      const ub = ((c - a) * (b - x) - (d - b) * (a - w)) / denominator

      // Is the intersection along the segments?
      if (ua < 0 || ua > 1 || ub < 0 || ub > 1) return

      // Assign the rewards.
      this.gate_progress[i] = true
      reward = 100.0 + 10 * i
    })

    return reward
  }

  /*
   * Utility for drawing lines with mouse events.
   */
  draw(): void {
    let point: Point | null = null
    this.drawing = true

    this.ctx.canvas.addEventListener("click", (e) => {
      const rect = this.ctx.canvas.getBoundingClientRect()
      const w = this.ctx.canvas.width
      const h = this.ctx.canvas.height
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      if (point) {
        this.store.push([point, [x, y]])
        point = null

        // Print out the new state of the lines.
        const lines = this.store.map((l) => l.map(([x, y]) => [x / w, y / h]))
        console.log("Store:", JSON.stringify(lines))
      } else point = [x, y]
    })
  }
}
