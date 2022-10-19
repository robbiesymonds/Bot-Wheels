import * as tf from "@tensorflow/tfjs"
import { Inputs } from "@model/controller"
import { Point } from "constants/types"

export class Model {
  private readonly EPSILON = 0.5

  private brain: tf.Sequential
  private start_time: number
  private training: boolean = false

  constructor() {
    this.brain = tf.sequential()
    this.brain.add(tf.layers.dense({ units: 4, inputShape: [16] }))
    this.brain.add(tf.layers.dense({ units: 2, activation: "relu" }))
    this.brain.compile({ loss: "meanSquaredError", optimizer: "adam" })
    this.start_time = performance.now()
  }

  predict(intersections: Point[]): Inputs {
    const random = () => Math.floor(Math.random() * 2) - 1
    if (Math.random() < this.EPSILON) {
      console.log("Random!")
      return { x: random(), y: random() }
    } else {
      console.log("Predict!")
      return tf.tidy(() => {
        const x = tf.tensor2d(intersections.flat(), [1, 16])
        const y = tf.tidy(() => this.brain.predict(x) as tf.Tensor).arraySync() as [Point]
        return { x: y[0][0], y: y[0][1] }
      })
    }
  }

  async train(intersections: Point[], reward: number) {
    if (this.training) return

    console.log("Reward: ", reward)
    const x = tf.tensor2d(intersections.flat(), [1, 16])
    const belief = ((this.brain.predict(x) as tf.Tensor).arraySync() as [Point])[0]
    belief[0] = Math.min(Math.max(-1, belief[0] + reward), 1)
    belief[1] = Math.min(Math.max(-1, belief[1] - reward), 1)

    this.training = true
    const y = tf.tensor2d(belief, [1, 2])
    await this.brain.fit(x, y)
    this.training = false
  }
}
