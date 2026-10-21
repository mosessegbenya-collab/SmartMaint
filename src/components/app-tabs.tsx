import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useApp } from "@/state/app-state";
import { tabItems } from "@/navigation/tabs";
export default function AppTabs() {
  const { account, dark } = useApp();
  if (!account) return null;
  return (
    <NativeTabs
      key={account.id}
      backgroundColor={dark ? "#16253B" : "#F8FCFF"}
      tintColor="#0866E8"
      labelStyle={{ fontSize: 10 }}
    >
      {tabItems(account).map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tab.sf} md={tab.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
