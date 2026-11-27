/**
 * Retorna todas as comandas abertas de uma mesa, sem presumir uma única conta.
 * Os valores financeiros individuais continuam vinculados ao id da comanda.
 */
export function comandasAbertasDaMesa(comandas, mesaId) {
  return comandas.filter(
    (comanda) => comanda.mesa_id === mesaId && comanda.status === "aberta"
  )
}

export function quantidadeComandasAbertas(comandas, mesaId) {
  return comandasAbertasDaMesa(comandas, mesaId).length
}

export function mesaPodeSerLiberada(comandas, mesaId) {
  return quantidadeComandasAbertas(comandas, mesaId) === 0
}
