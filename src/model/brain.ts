import { Inputs } from "@model/controller"
import { Point } from "constants/types"
import WASML from "wasml"

export class Model {
  private brain: WASML

  constructor() {
    this.brain = new WASML()
    const el = document.getElementById("export")
    if (el) el.onclick = () => this.download(this.brain.export(), "model.json")
  }

  async init() {
    await this.brain.karparthy(18, 8, {
      alpha: 0.01,
      epsilon: 0.15,
      gamma: 0.98,
      maxMemory: 1e7,
      batchSize: 100,
      episodeSize: 350,
      epsilonDecay: 1e6
    })
  }

  download(text: string, name: string) {
    const a = document.createElement("a")
    const type = name.split(".").pop()
    a.href = URL.createObjectURL(new Blob([text], { type: `text/${type === "txt" ? "plain" : type}` }))
    a.download = name
    a.click()
  }

  predict(intersections: Point[], meta: number[]): Inputs {
    const action = this.brain.predict([...intersections.flat(), ...meta])
    switch (action) {
      case 0:
        return { x: 0, y: 0 }
      case 1:
        return { x: 0, y: 1 }
      case 2:
        return { x: 0, y: -1 }
      case 3:
        return { x: 1, y: 0 }
      case 4:
        return { x: 1, y: 1 }
      case 5:
        return { x: 1, y: -1 }
      case 6:
        return { x: -1, y: 0 }
      case 7:
        return { x: -1, y: 1 }
      case 8:
        return { x: -1, y: -1 }
      default:
        return { x: 0, y: 0 }
    }
  }

  async train(reward: number, state: number[]) {
    console.log(reward)
    this.brain.reward(reward, state)
  }
}
