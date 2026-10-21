import "@/global.css";
import { Stack, ThemeProvider, DarkTheme, DefaultTheme } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { AppProvider, useApp } from "@/state/app-state";
import { palette } from "@/design/tokens";
import type { ReactNode } from "react";
function IdentityProvider({ children }: { children: ReactNode }) {
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return key ? (
    <ClerkProvider publishableKey={key} tokenCache={tokenCache}>
      {children}
    </ClerkProvider>
  ) : (
    children
  );
}
function Navigation() {
  const { account, dark, preferences } = useApp();
  return (
    <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: palette[dark ? "dark" : "light"].background,
          },
          animation: preferences.reducedMotion ? "none" : "default",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="access/[screen]" />
        <Stack.Screen name="flow/[screen]" />
        <Stack.Protected guard={!!account && account.status === "approved"}>
          <Stack.Screen name="workspace" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
export default function Root() {
  return (
    <IdentityProvider>
      <AppProvider>
        <Navigation />
      </AppProvider>
    </IdentityProvider>
  );
}
