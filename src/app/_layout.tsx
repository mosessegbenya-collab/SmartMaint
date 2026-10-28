import "@/global.css";
import { Stack, ThemeProvider, DarkTheme, DefaultTheme, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { IdentityProvider, useIdentity } from "@/features/access/identity";
import { ActivityIndicator, Platform, View } from "react-native";
import { useFonts } from "expo-font";
import { SessionRestoration } from "@/features/access/session-restoration";
import { canOpenPreviewWorkspace } from "@/features/access/auth-policy";
import { StaffAccessProvider, useStaffAccess } from "@/features/staff/provider";
import { accessCacheKey, canUseTrustedAccount } from "@/domain/staff-access";
import { ReportQueueBoundary } from "@/features/staff/report-queue";
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
        <Stack.Screen name="sso-callback" />
        <Stack.Screen name="sso-continue/[flow]" />
        <Stack.Protected guard={canOpenPreviewWorkspace(account, identity) || canUseTrustedAccount(access, access.connected, identity.signedIn)}>
          <Stack.Screen name="workspace" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
export default function Root() {
  const [fontsLoaded, fontError] = useFonts({ InterRegular: require("../../assets/fonts/Inter_400Regular.ttf"), InterSemiBold: require("../../assets/fonts/Inter_600SemiBold.ttf"), InterBold: require("../../assets/fonts/Inter_700Bold.ttf"), InterExtraBold: require("../../assets/fonts/Inter_800ExtraBold.ttf") });
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator accessibilityLabel="Loading SmartMaint typography" /></View>;
  return (
    <IdentityProvider>
      <IdentityNavigation />
    </IdentityProvider>
  );
}
function IdentityNavigation() {
  const pathname = usePathname();
  // Caller-only diagnostics reload Clerk state. Keep them outside staff/client
  // remount boundaries so a token refresh cannot discard their result.
  if (pathname === "/identity-connection") return <AppProvider><Navigation /></AppProvider>;
  // Keep the browser callback mounted while Clerk activates/replaces sessions.
  // Operational providers remount for authorization changes; they must not replay this handshake.
  if (Platform.OS === "web" && (pathname === "/sso-callback" || pathname.startsWith("/sso-continue/"))) return <AppProvider><Navigation /></AppProvider>;
  return <StaffAccessProvider><ReportQueueBoundary><SessionBoundary /></ReportQueueBoundary></StaffAccessProvider>;
}
function SessionBoundary() {
  const identity = useIdentity();
  const access = useStaffAccess();
  const pathname = usePathname();
  // These development tools contain synthetic examples only. They remain
  // inspectable while identity restores and never grant operational access.
  const developmentTool = __DEV__ && ["/diagnostics", "/design-system"].includes(pathname);
  // Public, fictional welcome content does not require a restored identity.
  // Every other normal route still waits, and workspace guards stay authoritative.
  const publicWelcome = pathname === "/";
  // Discard synthetic account data when the real identity/session changes.
  return <AppProvider key={identity.signedIn ? accessCacheKey(identity.sessionId, access) : "signed-out-preview"}>
    {identity.loaded || developmentTool || publicWelcome ? <Navigation /> : <SessionRestoration timedOut={identity.restoreTimedOut} onRetry={identity.retry} />}
  </AppProvider>;
}
