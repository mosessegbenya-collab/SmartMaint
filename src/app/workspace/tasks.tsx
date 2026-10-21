import { TasksList } from "@/features/workspace/lists";
import { StaffWorkspaceRoute } from "@/features/staff/workspace";
export default function Route() { return <StaffWorkspaceRoute screen="tasks" preview={TasksList} />; }
