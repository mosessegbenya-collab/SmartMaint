import "@/global.css";
import { Stack, ThemeProvider, DarkTheme, DefaultTheme } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { IdentityProvider, useIdentity } from "@/features/access/identity";
import { ActivityIndicator, View } from "react-native";
import { Txt, Button } from "@/components/smart/ui";
import { canOpenPreviewWorkspace } from "@/features/access/auth-policy";
import { StaffAccessProvider, useStaffAccess } from "@/features/staff/provider";
import { accessCacheKey, canUseTrustedAccount } from "@/domain/staff-access";
import { AppProvider, useApp } from "@/state/app-state";
import { palette } from "@/design/tokens";
function Navigation() {
  const { account, dark, preferences } = useApp();
  const identity = useIdentity();
  const access = useStaffAccess();
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
        <Stack.Screen name="access/[view]" />
        <Stack.Screen name="flow/[view]" />
        <Stack.Protected guard={canOpenPreviewWorkspace(account, identity) || canUseTrustedAccount(access, access.connected, identity.signedIn)}>
          <Stack.Screen name="workspace" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
export default function Root() {
  return (
    <IdentityProvider>
      <StaffAccessProvider><SessionBoundary /></StaffAccessProvider>
    </IdentityProvider>
  );
}
function SessionBoundary() {
  const identity = useIdentity();
  const access = useStaffAccess();
  // Discard synthetic account data when the real identity/session changes.
  return <AppProvider key={identity.signedIn ? accessCacheKey(identity.sessionId, access) : "signed-out-preview"}>
    {identity.loaded ? <Navigation /> : <View style={{ flex: 1, gap: 12, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator accessibilityLabel="Restoring secure session" />
      <Txt>Restoring secure session…</Txt>
      {identity.restoreTimedOut && <><Txt>Identity services are taking too long to respond.</Txt><Button label="Retry secure sign-in" onPress={identity.retry} /></>}
    </View>}
  </AppProvider>;
}
