import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import type { ReactElement } from 'react';
import { accessCacheKey, type StaffResolution } from '../../src/domain/staff-access';
import { diagnosticErrorStatus } from '../../src/features/access/identity-diagnostic-service';
import { canOpenPreviewWorkspace } from '../../src/features/access/auth-policy';
import { canUseTrustedAccount } from '../../src/domain/staff-access';

// Evaluate the actual layout boundaries with controlled hook values. No Clerk
// credentials, native renderer, network calls or fabricated backend are needed.
function boundary(name: string, dependencies: Record<string, unknown>): () => ReactElement {
  const file = ts.createSourceFile('layout.tsx', readFileSync('src/app/_layout.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = file.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  if (!declaration) throw new Error(`Missing layout boundary: ${name}`);
  const output = ts.transpileModule(`export ${declaration.getText(file)}`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: Record<string, () => ReactElement> = {};
  new Function('require', 'exports', ...Object.keys(dependencies), output)(createRequire(import.meta.url), exports, ...Object.values(dependencies));
  return exports[name];
}

const AppProvider = () => null;
const Navigation = () => null;
const StaffAccessProvider = () => null;
const ReportQueueBoundary = () => null;
const SessionBoundary = () => null;
const SessionRestoration = () => null;
const components = { AppProvider, Navigation, StaffAccessProvider, ReportQueueBoundary, SessionBoundary, SessionRestoration };

test('only public welcome and explicit development tools render during restoration; normal protected routes still wait', () => {
  let pathname = '/';
  let dev = false;
  const retry = () => {};
  const identity = { loaded: false, signedIn: false, sessionId: null, restoreTimedOut: true, retry };
  const render = () => boundary('SessionBoundary', { ...components, __DEV__: dev,
    useIdentity: () => identity, useStaffAccess: () => ({ status: 'loading', account: null }), usePathname: () => pathname, accessCacheKey })();
  expect((render().props as { children: ReactElement }).children.type).toBe(Navigation);
  for (const route of ['/access/sign-in', '/access/pending', '/workspace/home', '/flow/live-task', '/flow/review', '/design-system', '/diagnostics', '/unknown']) {
    pathname = route;
    const pending = (render().props as { children: ReactElement }).children;
    expect(pending.type).toBe(SessionRestoration);
    expect(pending.props).toMatchObject({ timedOut: true, onRetry: retry });
  }
  dev = true;
  for (const route of ['/design-system', '/diagnostics']) {
    pathname = route;
    expect((render().props as { children: ReactElement }).children.type).toBe(Navigation);
  }
  pathname = '/workspace/home';
  expect((render().props as { children: ReactElement }).children.type).toBe(SessionRestoration);
  identity.loaded = true;
  expect((render().props as { children: ReactElement }).children.type).toBe(Navigation);
});

test('public navigation during restoration keeps the real workspace guard closed, including retained synthetic accounts', () => {
  const Protected = () => null;
  const Stack = Object.assign(() => null, { Screen: () => null, Protected });
  const ThemeProvider = () => null;
  const tree = boundary('Navigation', { Stack, ThemeProvider, StatusBar: () => null, DefaultTheme: {}, DarkTheme: {}, palette: { light: { background: '#fff' } },
    useApp: () => ({ account: { status: 'approved' }, dark: false, preferences: { reducedMotion: true } }),
    useIdentity: () => ({ loaded: false, signedIn: false }), useStaffAccess: () => ({ status: 'loading', account: null, connected: false }),
    canOpenPreviewWorkspace, canUseTrustedAccount })();
  const stack = (tree.props as { children: ReactElement[] }).children.find(child => child.type === Stack)!;
  const guarded = (stack.props as { children: ReactElement[] }).children.find(child => child.type === Protected)!;
  expect((guarded.props as { guard: boolean }).guard).toBe(false);
});

test('diagnostic route stays outside authorization remounts while normal routes retain their guards', () => {
  let pathname = '/identity-connection';
  let resolution: StaffResolution = { status: 'identity_unverified', account: null };
  const identity = { loaded: true, signedIn: true, sessionId: 'synthetic-session' };
  const accountBoundary = boundary('SessionBoundary', { ...components, __DEV__: true,
    useIdentity: () => identity, useStaffAccess: () => resolution, usePathname: () => pathname, accessCacheKey });
  const oldKey = accountBoundary().key;
  resolution = { status: 'loading', account: null };
  expect(accountBoundary().key).not.toBe(oldKey); // Reproduces why screen-owned results were lost.

  for (const OS of ['web', 'android']) {
    const navigationBoundary = boundary('IdentityNavigation', { ...components, usePathname: () => pathname, Platform: { OS } });
    for (const status of ['loading', 'identity_unverified', 'backend_unavailable'] as const) {
      resolution = { status, account: null };
      const tree = navigationBoundary();
      expect(tree.type).toBe(AppProvider);
      expect(tree.key).toBeNull();
      expect((tree.props as { children: ReactElement }).children.type).toBe(Navigation);
    }
    pathname = '/access/pending';
    expect(navigationBoundary().type).toBe(StaffAccessProvider);
    pathname = '/workspace/home';
    expect(navigationBoundary().type).toBe(StaffAccessProvider);
    pathname = '/identity-connection';
  }
});

test('isolated diagnostic screen stays session-scoped and has no staff client or persistent token storage', () => {
  const source = readFileSync('src/features/access/identity-diagnostics.tsx', 'utf8');
  expect(source).toContain('ConfiguredDiagnostics key={identity.sessionId}');
  expect(source).toContain('identity.configured && identity.signedIn');
  expect(source).not.toMatch(/useStaffAccess|localStorage|sessionStorage|console\./);
  expect(readFileSync('src/app/identity-connection.tsx', 'utf8')).toContain('IdentityConnectionScreen');
});

test('diagnostic error codes never echo provider messages, tokens or unknown codes', () => {
  expect(diagnosticErrorStatus({ code: 'resource_not_found', message: '[secret]' })).toBe('resource_not_found');
  expect(diagnosticErrorStatus({ errors: [{ code: 'session_expired', longMessage: '[secret]' }] })).toBe('session_expired');
  for (const error of [null, '[secret]', { code: '[secret]' }, { message: '[secret]' }, { errors: [null] }]) {
    expect(diagnosticErrorStatus(error)).toBe('diagnostic_request_failed');
  }
});
