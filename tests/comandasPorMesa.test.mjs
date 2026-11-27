import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  comandasAbertasDaMesa,
  quantidadeComandasAbertas,
  mesaPodeSerLiberada,
} from "../src/lib/comandasPorMesa.js"

const lista = [
  { id: "ana", mesa_id: "mesa-1", status: "aberta", cliente: "Ana" },
  { id: "bruno", mesa_id: "mesa-1", status: "aberta", cliente: "Bruno" },
  { id: "carla", mesa_id: "mesa-1", status: "aberta", cliente: "Carla" },
  { id: "outra", mesa_id: "mesa-2", status: "aberta", cliente: "Daniel" },
]

describe("comandas individuais por mesa", () => {
  it("lista todas as comandas abertas da mesma mesa", () => {
    assert.deepEqual(comandasAbertasDaMesa(lista, "mesa-1").map(c => c.id),
      ["ana", "bruno", "carla"])
  })
  it("não conta clientes de outras mesas", () => {
    assert.equal(quantidadeComandasAbertas(lista, "mesa-2"), 1)
    assert.equal(quantidadeComandasAbertas(lista, "mesa-3"), 0)
  })
  it("fechamento parcial não libera a mesa", () => {
    const aposFecharBruno = lista.map(c =>
      c.id === "bruno" ? { ...c, status: "fechada" } : c
    )
    assert.deepEqual(comandasAbertasDaMesa(aposFecharBruno, "mesa-1").map(c=>c.id), ["ana", "carla"])
    assert.equal(mesaPodeSerLiberada(aposFecharBruno, "mesa-1"), false)
  })
  it("cancelamento parcial não libera a mesa", () => {
    const aposCancelarAna = lista.map(c =>
      c.id === "ana" ? { ...c, status: "cancelada" } : c
    )
    assert.equal(mesaPodeSerLiberada(aposCancelarAna, "mesa-1"), false)
  })
  it("libera apenas após última comanda encerrar", () => {
    const encerradas = lista.map(c =>
      c.mesa_id === "mesa-1" ? { ...c, status: "fechada" } : c
    )
    assert.equal(mesaPodeSerLiberada(encerradas, "mesa-1"), true)
    assert.equal(mesaPodeSerLiberada(encerradas, "mesa-2"), false)
  })
  it("não altera a entrada nem confunde histórico", () => {
    const antes = structuredClone(lista)
    comandasAbertasDaMesa(lista, "mesa-1")
    assert.deepEqual(lista, antes)
  })
})
