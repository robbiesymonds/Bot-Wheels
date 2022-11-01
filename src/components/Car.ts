import { dist } from "@utils/distance"
import { Line, Point } from "constants/types"
import { Inputs } from "model/controller"

interface CarConstructor {
  position: Point
  height: number
  width: number
}

const INITIAL = {
  state: {
    position: [0, 0] as Point,
    velocity: 0,
    acceleration: 0,
    rotation: 0
  },
  sensors: Array(8).fill([
    [0, 0],
    [0, 0]
  ]),
  intersections: Array(8).fill([0, 0])
}

export class Car {
  private readonly JERK = 0.001
  private readonly FRICTION = 0.97
  private readonly TURNING_RATE = 500
  private readonly D2R = Math.PI / 180
  private readonly MAX_SENSOR_LENGTH = 0.1
  private readonly MAX_FORWARD_SPEED = 0.008
  private readonly MAX_REVERSE_SPEED = -0.003

  private width: number
  private height: number
  private position: Point
  private sensors = INITIAL.sensors

  state = INITIAL.state
  debug: boolean = true
  crashed: boolean = false
  ctx!: CanvasRenderingContext2D
  intersections = INITIAL.intersections
  skeleton: Line = [
    [0, 0],
    [0, 0]
  ]

  constructor({ position, width, height }: CarConstructor) {
    this.state.position = [...position]
    this.position = position
    this.height = height
    this.width = width
  }

  private scale = ([x, y]: Point) => [x * this.ctx.canvas.width, y * this.ctx.canvas.height]
  private dimensions = () => [this.width, this.height].map((n) => n * this.ctx.canvas.width)
  private rotate = (points: Point[], [cx, cy]: Point, offset: number = 0): Line => {
    const { rotation: r } = this.state
    const s = Math.sin((r + offset) * this.D2R)
    const c = Math.cos((r + offset) * this.D2R)

    return points.map((p) => {
      // Transform origin.
      p[0] -= cx
      p[1] -= cy

      // Rotate positions.
      const xn = p[0] * c - p[1] * s
      const yn = p[0] * s + p[1] * c

      // Translate point back.
      return [xn + cx, yn + cy] as Point
    }) as Line
  }

  /*
   * Resets the car to initial state.
   */
  reset(): void {
    this.state = { ...INITIAL.state, position: [...this.position] }
    this.intersections = INITIAL.intersections
    this.sensors = INITIAL.sensors
    this.crashed = false
  }

  /*
   * Updates the car's dynamics given inputs.
   */
  update(inputs: Inputs): void {
    const s = this.state
    const [w, h] = this.dimensions()
    const m = this.MAX_SENSOR_LENGTH * this.ctx.canvas.width

    // Update the cars dynamics.
    s.acceleration = inputs.y !== 0 ? this.JERK * inputs.y : 0
    s.velocity = (s.velocity + s.acceleration) * this.FRICTION
    s.velocity = Math.max(this.MAX_REVERSE_SPEED, Math.min(this.MAX_FORWARD_SPEED, s.velocity))
    if (inputs.x !== 0 && Math.abs(s.velocity) > 0.0005) {
      s.rotation += inputs.x * this.TURNING_RATE * Math.abs(s.velocity)
    }

    const dx = Math.sin(s.rotation * this.D2R) / 2
    const dy = Math.cos(s.rotation * this.D2R)
    const vector: Point = s.position
    vector[0] += s.velocity * dx
    vector[1] -= s.velocity * dy

    // Appply new position.
    s.position = vector
    this.state = { ...this.state, ...s }

    // Update the sensor raycasts.
    this.sensors = this.sensors.map((s, i) => {
      const [x, y] = this.scale(vector)
      const cx = x + w / 2
      const cy = y + h / 4
      switch (i) {
        case 0: {
          // Front Center
          const start: Point = [x + w / 2, y]
          const end: Point = [start[0], start[1] - m]
          return this.rotate([start, end], [cx, cy])
        }
        case 1: {
          // Front Right
          const start: Point = this.rotate([[x + w, y]], [cx, cy])[0]
          const end: Point = this.rotate([[start[0], start[1] - m]], start, 45)[0]
          return [start, end]
        }
        case 2: {
          // Center Right
          const start: Point = [x + w, y + h / 2]
          const end: Point = [start[0] + m, start[1]]
          return this.rotate([start, end], [cx, cy])
        }
        case 3: {
          // Rear Right
          const start: Point = this.rotate([[x + w, y + h]], [cx, cy])[0]
          const end: Point = this.rotate([[start[0], start[1] - m]], start, 135)[0]
          return [start, end]
        }
        case 4: {
          // Rear Center
          const start: Point = [x + w / 2, y + h]
          const end: Point = [start[0], start[1] + m]
          return this.rotate([start, end], [cx, cy])
        }
        case 5: {
          // Rear Left
          const start: Point = this.rotate([[x, y + h]], [cx, cy])[0]
          const end: Point = this.rotate([[start[0], start[1] - m]], start, -135)[0]
          return [start, end]
        }
        case 6: {
          // Center Left
          const start: Point = [x, y + h / 2]
          const end: Point = [start[0] - m, start[1]]
          return this.rotate([start, end], [cx, cy])
        }
        case 7: {
          // Front Left
          const start: Point = this.rotate([[x, y]], [cx, cy])[0]
          const end: Point = this.rotate([[start[0], start[1] - m]], start, -45)[0]
          return [start, end]
        }
        default:
          return s
      }
    })

    const [x, y] = this.scale(vector)
    const cx = x + w / 2
    const cy = y + h / 4
    this.skeleton = this.rotate(
      [
        [x + w / 2, y],
        [x + w / 2, y + h]
      ],
      [cx, cy]
    )
  }

  /*
   * Calculate intersections between the car and given lines.
   */
  intersects(lines: Line[]) {
    const intersections: Point[] = Array(8).fill([0, 0])

    lines.forEach((l) => {
      this.sensors.forEach((s, i) => {
        const [[a, b], [c, d]] = l
        const [[w, x], [y, z]] = s
        const denominator = (z - x) * (c - a) - (y - w) * (d - b)

        // Lines are parallel.
        if (denominator === 0) return

        const ua = ((y - w) * (b - x) - (z - x) * (a - w)) / denominator
        const ub = ((c - a) * (b - x) - (d - b) * (a - w)) / denominator

        // Is the intersection along the segments?
        if (ua < 0 || ua > 1 || ub < 0 || ub > 1) return

        // Return the intersection point.
        const px = a + ua * (c - a)
        const py = b + ua * (d - b)
        if (dist([px, py], s[0]) < dist(intersections[i], s[0])) intersections[i] = [px, py]

        // Update car state if crashed.
        if (dist([px, py], s[0]) <= 3) this.crashed = true
      })
    })

    // Normalise.
    const { width, height } = this.ctx.canvas
    this.intersections = intersections.map((i) => [i[0] / width, i[1] / height])
  }

  /*
   * Draws the car given the current state.
   */
  render(): void {
    const { position: p, rotation: r } = this.state
    const [w, h] = this.dimensions()
    const [x, y] = this.scale(p)
    const cx = x + w / 2
    const cy = y + h / 4

    // Draw car shape.
    const c = this.ctx
    c.beginPath()
    c.save()
    {
      c.fillStyle = "#E22E2E"
      c.translate(cx, cy)
      c.rotate(r * this.D2R)
      c.translate(-cx, -cy)
      c.fillRect(x, y, w, h)
    }
    c.restore()

    // Optionally draw sensors.
    if (this.debug) {
      c.lineWidth = 0.001 * c.canvas.width
      c.strokeStyle = "#ffffff"

      this.sensors.forEach((s, i) => {
        c.moveTo(s[0][0], s[0][1])
        c.lineTo(s[1][0], s[1][1])

        // Draw intersection points.
        const [px, py] = this.scale(this.intersections[i])
        if (px !== 0 && py !== 0) {
          c.moveTo(px, py)
          c.arc(px, py, 0.0035 * c.canvas.width, 0, 2 * Math.PI)
        }
      })
    }

    c.stroke()
    c.closePath()
  }
}
