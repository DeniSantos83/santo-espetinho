export function comandasAbertasDaMesa(comandas, mesaId) {
  return (comandas ?? []).filter((comanda) => comanda.mesa_id === mesaId && comanda.status === "aberta")
}
