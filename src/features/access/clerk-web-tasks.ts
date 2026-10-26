type TaskComponents = Pick<typeof import("@clerk/react"), "TaskChooseOrganization" | "TaskResetPassword" | "TaskSetupMFA">;

// @clerk/expo 4.13 loads @clerk/react/internal through CommonJS. A direct
// ES-module import creates a second Clerk context in Metro's web bundle.
// Tasks are not exported by @clerk/expo/web, so match the SDK's require path.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- The ES entry reproduces a separate provider context; this SDK compatibility boundary must use CommonJS.
const tasks: TaskComponents = require("@clerk/react");

export const { TaskChooseOrganization, TaskResetPassword, TaskSetupMFA } = tasks;
