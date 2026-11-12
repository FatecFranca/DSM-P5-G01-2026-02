/**
 * O Google devolve o login ao app por `br.edu.prosa.mobile:/oauthredirect?code=...`. Quem consome esse retorno
 * é o expo-auth-session (via Linking); o expo-router, porém, também tenta abrir a URL como rota e mostra
 * "Unmatched Route". Retornar null mantém o app na tela atual (o login) enquanto o fluxo termina.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  return path.includes("oauthredirect") ? null : path;
}
