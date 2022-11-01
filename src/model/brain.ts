import { Inputs } from "@model/controller"
import { Point } from "constants/types"
import { DQNEnv, DQNOpt, DQNSolver } from "reinforce-js"

export class Model {
  private brain: DQNSolver

  constructor() {
    const opt = new DQNOpt()
    opt.setEpsilon(0.01)
    opt.setRewardClipping(false)
    opt.setNumberOfHiddenUnits([16])
    this.brain = new DQNSolver(new DQNEnv(100, 100, 16 + 5, 8), opt)
  }

  predict(intersections: Point[], meta: [number, number, number, number, number, number]): Inputs {
    const r = (n: number) => parseFloat(n.toFixed(4))

    const action = this.brain.decide([...intersections.flat().map(r), ...meta.map(r)])
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

  async train(reward: number) {
    this.brain.learn(reward)
  }
}
