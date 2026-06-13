import type { CareerState } from "./career"

export function trainServe(career: CareerState) {
  career.player.attributes.serve += 1
  career.fitness -= 10
}

export function trainForehand(career: CareerState) {
  career.player.attributes.forehand += 1
  career.fitness -= 10
}

export function trainSpeed(career: CareerState) {
  career.player.attributes.speed += 1
  career.fitness -= 12
}

export function trainMentality(career: CareerState) {
  career.player.attributes.mentality += 1
  career.money -= 500
}