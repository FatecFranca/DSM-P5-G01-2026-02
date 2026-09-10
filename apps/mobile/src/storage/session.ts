import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN = "alfabetiza.access_token";
const REFRESH_TOKEN = "alfabetiza.refresh_token";
export const sessionStorage = {
  load: async () => ({ accessToken: await SecureStore.getItemAsync(ACCESS_TOKEN), refreshToken: await SecureStore.getItemAsync(REFRESH_TOKEN) }),
  save: async (accessToken: string, refreshToken: string) => Promise.all([SecureStore.setItemAsync(ACCESS_TOKEN, accessToken), SecureStore.setItemAsync(REFRESH_TOKEN, refreshToken)]),
  clear: async () => Promise.all([SecureStore.deleteItemAsync(ACCESS_TOKEN), SecureStore.deleteItemAsync(REFRESH_TOKEN)]),
};
