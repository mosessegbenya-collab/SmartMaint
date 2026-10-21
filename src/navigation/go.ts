import { router } from "expo-router";
export function go(screen: string, id?: string) {
  router.push({
    pathname: "/flow/[screen]",
    params: { screen, ...(id ? { id } : {}) },
  });
}
