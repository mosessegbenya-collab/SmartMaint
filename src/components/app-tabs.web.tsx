import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";
import { Pressable } from "react-native";
import { useApp } from "@/state/app-state";
import { tabItems } from "@/navigation/tabs";
import { Icon, Txt, usePalette } from "./smart/ui";
export default function AppTabs() {
  const { account } = useApp();
  const p = usePalette();
  if (!account) return null;
  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList
        style={{
          backgroundColor: p.card,
          borderTopWidth: 1,
          borderColor: p.border,
          justifyContent: "space-around",
          paddingBottom: 10,
          paddingTop: 5,
        }}
      >
        {tabItems(account).map((tab) => (
          <TabTrigger
            key={tab.name}
            name={tab.name}
            href={`/workspace/${tab.name}`}
            asChild
          >
            <Pressable
              style={{
                minHeight: 52,
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                paddingHorizontal: 6,
              }}
            >
              <Icon name={tab.icon} />
              <Txt size={10}>{tab.label}</Txt>
            </Pressable>
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}
