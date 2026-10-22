import Constants from "expo-constants";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithCredential, signOut } from "firebase/auth";

const config = (Constants.expoConfig?.extra?.firebase ?? {}) as { apiKey?: string; authDomain?: string; projectId?: string; appId?: string };

/**
 * Troca o id_token do Google por um ID token do Firebase Auth. O Firebase só serve para provar a identidade:
 * a sessão do app continua sendo a da API (JWT próprio), então encerramos a sessão do Firebase em seguida.
 */
export async function signInWithGoogleIdToken(googleIdToken: string): Promise<string> {
  const auth = getAuth(getApps().length ? getApp() : initializeApp(config));
  const { user } = await signInWithCredential(auth, GoogleAuthProvider.credential(googleIdToken));
  const token = await user.getIdToken();
  await signOut(auth).catch(() => undefined);
  return token;
}
