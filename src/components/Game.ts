import { Car } from "@components/Car"
import { Track } from "@components/Track"
import { Model } from "@model/brain"
import { debounce } from "@utils/debounce"
import { GATES_DATA, TRACK_DATA } from "constants/track"
import { PlayerController } from "model/controller"
import Stats from "stats.js"

interface GameConstructor {
  car: Car
  track: Track
}

export class Game {
  private readonly FPS = 60
  private readonly ASPECT = 1 / 2
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private player: PlayerController
  private timestamp: number
  private stats: Stats
  private track: Track
  private model: Model
  private car: Car

  constructor({ car, track }: GameConstructor) {
    const canvas = document.getElementById("game") as HTMLCanvasElement
    this.ctx = canvas.getContext("2d")!
    this.timestamp = Date.now()
    this.canvas = canvas

    // Assign variables.
    this.player = new PlayerController()
    this.model = new Model()
    track.ctx = this.ctx
    car.ctx = this.ctx
    this.track = track
    this.car = car

    // Add ability for canvas to resize dynamically.
    window.addEventListener("resize", this.resize)
    this.resize()

    // Create interface elements.
    this.stats = new Stats()
    this.stats.dom.classList.add("stats")
    document.body.appendChild(this.stats.dom)
    document.getElementById("debug")?.addEventListener("change", this.debug.bind(this))
  }

  /*
   * Updates the debug state of components.
   */
  private debug(e: Event) {
    const debug = !(e.target as HTMLInputElement).checked
    this.track.debug = debug
    this.car.debug = debug
  }

  /*
   * Adjusts the dimensions of the canvas element.
   */
  private resize = debounce(() => {
    const { clientWidth } = document.body
    const h = clientWidth * this.ASPECT
    const w = clientWidth

    this.canvas.width = w
    this.canvas.height = h
    document.body.style.setProperty("--width", `${w}px`)
    document.body.style.setProperty("--height", `${h}px`)
    this.track.update()
  }, 100)

  /*
   * The main game/rendering loop.
   */
  loop() {
    const now = Date.now()
    const delta = now - this.timestamp
    requestAnimationFrame(this.loop.bind(this))

    // Throttle to meet required FPS.
    if (delta > 1000 / this.FPS) {
      this.stats.begin()

      // Clear the frame.
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

      // Update car inputs.
      // const inputs = this.player.inputs
      const inputs = this.model.predict(this.car.intersections)
      this.car.update(inputs)

      // Check if car has crashed.
      this.car.intersects(track.walls)
      let reward = this.track.reward(car.skeleton)
      // let reward = this.model.reward(gates)

      if (this.car.crashed) {
        this.car.reset()
        reward = -1
      }

      // The model learns from the given inputs and the new intersections and reward.
      this.model.train(this.car.intersections, reward)

      this.track.render()
      this.car.render()

      this.timestamp = now - (delta % (1000 / this.FPS))
      this.stats.end()
    }
  }
}

/*
 * [!] Configure and initialise the game instance.
 */

const car = new Car({ position: [0.07, 0.6], width: 0.01, height: 0.02 })
const track = new Track({ walls: TRACK_DATA, gates: GATES_DATA })
const game = new Game({ car, track })
game.loop()
