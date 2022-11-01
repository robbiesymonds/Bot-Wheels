import { Point } from "constants/types"

export const dist = (a?: Point, b?: Point) =>
  a && b ? Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2)) : 99999
