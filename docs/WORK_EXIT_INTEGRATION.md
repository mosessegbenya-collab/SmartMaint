# Leaving unfinished maintenance work

28 October 2026. Maintenance editors now require an explicit choice before navigation removes a route containing unsaved work. The shared dialog uses the existing scrollable, opaque dialog surface and semantic destructive action.

The dirty comparison includes diagnosis, evidence, cause assessment, notes, parts, every preventive checklist result and a pending unadded part. It compares against the initially loaded or last acknowledged work, independently of the revision-review snapshot. Accepting a newer revision while retaining local fields compares those fields against the current server work. Loading server fields explicitly replaces the baseline and clears the pending part.

Only an acknowledged work-save response advances the recorded baseline. A failure preserves local fields and their unsaved status. While saving, route removal is blocked and explains that a submitted mutation cannot be cancelled here. Once the result arrives, the dialog reflects whether unrecorded fields remain. Staying in the editor cancels the pending navigation; confirming discard resumes the exact prevented navigation action without changing server work.

This uses SDK57 `usePreventRemove` from `expo-router/react-navigation`, with navigation from `expo-router`. It protects back/pop, replacement and other navigation actions that remove the route. A push retains the prior editor on the stack and does not prompt. It does not intercept process termination, browser reload/close, access-boundary unmounts or sign-out, and does not persist a maintenance draft. Protected access changes must remain authoritative.

The development `/design-system?example=work` preview uses the actual hook. Make sample edit, attempt to leave, stay or discard; Start sample save simulates a pending mutation, and Finish sample save acknowledges the fictional fields locally. It never sends maintenance work or accesses private storage. [Automated and Android evidence](../validation/current/WORK_EXIT_INTEGRATION_2026-10-28.md).

API references: [Expo SDK57 Router](https://docs.expo.dev/versions/v57.0.0/sdk/router/), [Expo Router migration/import paths](https://docs.expo.dev/router/migrate/from-react-navigation/), [prevent-remove behavior and limitations](https://reactnavigation.org/docs/use-prevent-remove/), [React Native 0.86 Modal](https://reactnative.dev/docs/0.86/modal). The installed Expo Router hook and redispatch implementation were also inspected.
