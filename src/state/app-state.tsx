import React, { createContext, useContext, useRef, useState } from "react";
import { useColorScheme } from "react-native";
import type { Account, DemoState, FaultDraft, Role } from "../domain/models";
import { demoAccount, initialState } from "../services/fixtures";
import { useIdentity } from "../features/access/identity";
import { useStaffAccess } from "../features/staff/provider";

let counter = 0;
export const newDraft = (equipmentId = "DEMO-VENT-014"): FaultDraft => ({
  operationId: `local-${Date.now()}-${++counter}`,
  equipmentId,
  category: "",
  symptoms: "",
  description: "",
  priority: "High",
  condition: "",
  inUse: null,
  noticedAt: new Date().toISOString(),
  photos: [],
  unverified: false,
});
type Preferences = {
  theme: "system" | "light" | "dark";
  contrast: boolean;
  bold: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  notifications: Record<string, boolean>;
};
type Context = {
  mode: "preview" | "live" | "locked";
  account: Account | null;
  state: DemoState;
  setState: React.Dispatch<React.SetStateAction<DemoState>>;
  enter: (role: Role, independent?: boolean) => void;
  signOut: () => void;
  draft: FaultDraft;
  setDraft: React.Dispatch<React.SetStateAction<FaultDraft>>;
  startReport: (id: string, unverified?: boolean) => void;
  online: boolean;
  setOnline: (v: boolean) => void;
  preferences: Preferences;
  setPreferences: React.Dispatch<React.SetStateAction<Preferences>>;
  dark: boolean;
  previewEnabled: boolean;
  expired: boolean;
  expire: () => void;
  recover: () => void;
};
const AppContext = createContext<Context | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const identity = useIdentity();
  const access = useStaffAccess();
  const [previewAccount, setAccount] = useState<Account | null>(null);
  const account = identity.signedIn ? access.account : previewAccount;
  const mode = identity.signedIn ? (account ? "live" : "locked") : "preview";
  const [state, setState] = useState<DemoState>(() => identity.signedIn ? { reports: [], tasks: [], attempts: [], holds: [], queue: [], audit: [], applications: [], notifications: [] } : initialState());
  const [draft, setDraft] = useState(newDraft);
  const [online, setOnline] = useState(true);
  const [expired, setExpired] = useState(false);
  const previousAccount = useRef<Account | null>(null);
  const [preferences, setPreferences] = useState<Preferences>({
    theme: "system",
    contrast: false,
    bold: false,
    largeText: false,
    reducedMotion: false,
    notifications: {},
  });
  const scheme = useColorScheme();
  const previewEnabled =
    identity.loaded && !identity.signedIn && (__DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEMO === "true");
  const enter = (role: Role, independent = false) => {
    if (!previewEnabled) return;
    setAccount(demoAccount(role, independent));
    setDraft(newDraft());
    setExpired(false);
    previousAccount.current = null;
  };
  const signOut = () => {
    setAccount(null);
    setDraft(newDraft());
    setExpired(false);
    previousAccount.current = null;
  };
  const expire = () => {
    previousAccount.current = account;
    setAccount(null);
    setDraft(newDraft());
    setExpired(true);
  };
  const recover = () => {
    if (previousAccount.current && previewEnabled) {
      setAccount(previousAccount.current);
      setExpired(false);
      previousAccount.current = null;
    }
  };
  return (
    <AppContext.Provider
      value={{
        account,
        mode,
        state,
        setState,
        enter,
        signOut,
        draft,
        setDraft,
        startReport: (id, unverified = false) =>
          setDraft({ ...newDraft(id), unverified }),
        online,
        setOnline,
        preferences,
        setPreferences,
        dark:
          preferences.theme === "dark" ||
          (preferences.theme === "system" && scheme === "dark"),
        previewEnabled,
        expired,
        expire,
        recover,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("Missing AppProvider");
  return context;
}
