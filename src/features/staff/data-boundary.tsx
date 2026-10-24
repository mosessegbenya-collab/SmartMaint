import { Component, type ReactNode } from "react";
import { router } from "expo-router";
import { Button, Notice, Screen } from "@/components/smart/ui";

export class StaffDataBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <Screen title="Record unavailable"><Notice tone="warning">This record could not be loaded. It may be outside your current access, no longer exist, or require a connection. Return to your workspace to choose an authorized record.</Notice><Button label="Try again" onPress={() => this.setState({ failed: false })} /><Button label="Return to workspace" variant="secondary" onPress={() => router.replace("/workspace/home")} /></Screen>;
  }
}
