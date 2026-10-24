import { Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { Badge, brandAssets, Card, Icon, IconButton, LinkRow, Notice, Row, Screen, Txt, usePalette, type IconName } from '@/components/smart/ui';
import { go } from '@/navigation/go';
import { staffApi } from '@/services/staff-api';
import { useStaffAccess } from './provider';

type Shortcut = { title: string; detail: string; icon: IconName; route: string };

export function StaffHome() {
  const { account } = useStaffAccess();
  const p = usePalette();
  const unread = useQuery(staffApi.workflows.hasUnreadNotice);
  if (!account) return null;
  const has = (cap: string) => account.capabilities.some((c) => c === cap);
  const clinician = account.role === 'Clinician';
  const technician = account.role === 'Biomedical Technician';
  const administrator = account.role === 'Administrator';
  const management = !clinician && !technician && !has('assign') && has('analytics');
  const shortcuts: Shortcut[] = [];
  const add = (condition: boolean, title: string, detail: string, icon: IconName, route: string) => { if (condition) shortcuts.push({ title, detail, icon, route }); };
  if (clinician) {
    add(has('report'), 'Scan Equipment QR', 'Identify equipment instantly', 'qr-code-outline', 'scan');
    add(has('report'), 'Report a Fault', 'Report an issue with equipment', 'warning-outline', 'live-report');
    add(has('report'), 'My Reports', 'View the status of your reports', 'document-text-outline', 'live-reports');
    add(true, 'View Equipment', 'Search and view equipment details', 'cube-outline', 'equipment-list');
  } else if (administrator) {
    add(has('accounts'), 'Signup Approvals', 'Review pending applications', 'people-outline', 'staff-applications');
    add(has('roles') || has('suspend'), 'Roles', 'Manage approved staff access', 'shield-checkmark-outline', 'staff-accounts');
    add(has('reconcile'), 'Equipment', 'Register verified inventory', 'clipboard-outline', 'equipment-registry');
    add(has('report'), 'Sync Status', 'Review report synchronization', 'sync-outline', 'sync');
    add(has('audit'), 'Audit History', 'View administrative activity logs', 'document-text-outline', 'staff-audit');
    add(has('export'), 'Exports', 'Generate authorized reports', 'bar-chart-outline', 'live-export');
  } else {
    add(has('repair') || has('assign'), technician ? 'My Tasks' : 'Open Tasks', 'Review maintenance work', 'clipboard-outline', 'live-tasks');
    add(has('technical'), 'Technical Verification', 'Review completed repairs', 'checkmark-circle-outline', 'technical-queue');
    add(has('clinical'), 'Clinical Verification', 'Review clinical safety checks', 'medkit-outline', 'clinical-queue');
    add(true, 'Equipment', 'View authorized inventory', 'desktop-outline', 'equipment-list');
    add(has('repair') || has('report'), 'Scan QR', 'Identify equipment', 'qr-code-outline', 'scan');
    add(has('assign'), 'Preventive Maintenance', 'Review schedules and due dates', 'calendar-outline', 'preventive-schedules');
    add(has('analytics'), 'Review Reports', 'View department summary', 'bar-chart-outline', 'live-analytics');
    add(has('reconcile'), 'Data Quality', 'Review unverified identities', 'pie-chart-outline', 'reconcile');
  }
  const open = (route: string) => {
    if (route === 'equipment-list') router.push('/workspace/equipment');
    else if (route === 'staff-applications') router.push('/workspace/accounts');
    else go(route);
  };
  return <Screen back={false} header={<Row style={{ paddingHorizontal: 18, paddingVertical: 10, justifyContent: 'space-between' }}><Row style={{ gap: 7 }}><Image source={brandAssets.logo} style={{ width: 46, height: 46 }} accessibilityLabel="SmartMaint logo" /><Txt size={27} weight="800">Smart<Txt size={27} weight="800" color="#0866E8">Maint</Txt></Txt></Row><IconButton name={unread ? 'notifications' : 'notifications-outline'} label={unread ? 'Unread notifications' : 'Notifications'} onPress={() => router.push('/workspace/notifications')} /></Row>}>
    {clinician || administrator || management ? <View style={{ gap: 6, paddingVertical: 12 }}><Txt size={17} muted>{management ? 'Management Overview' : 'Hello,'}</Txt><Txt size={29} weight="800">{account.name}</Txt><Txt size={17} muted>{clinician ? 'Keep equipment safe and available for reliable care.' : administrator ? 'Manage staff access, equipment data and administrative activity.' : 'Overview of reports and maintenance activity across your authorized departments.'}</Txt>{administrator && <Badge label="Restricted Administrator" />}</View> : <Card style={{ gap: 8 }}><Row><View style={{ padding: 12, backgroundColor: p.input, borderRadius: 40 }}><Icon name="person" size={40} /></View><View style={{ flex: 1, gap: 4 }}><Txt muted size={16}>Hello</Txt><Txt size={25} weight="800">{account.name}</Txt><Txt muted>{account.role}</Txt></View></Row></Card>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{shortcuts.map((shortcut) => <Pressable key={shortcut.title} accessibilityRole="button" accessibilityLabel={`${shortcut.title}. ${shortcut.detail}`} onPress={() => open(shortcut.route)} style={{ width: '48%', flexGrow: 1, minWidth: 140 }}><Card style={{ minHeight: clinician ? 168 : 138, gap: 10, height: '100%' }}><Icon name={shortcut.icon} size={clinician ? 42 : 32} /><Row style={{ alignItems: 'flex-start' }}><Txt weight="700" size={18} style={{ flex: 1 }}>{shortcut.title}</Txt><Icon name="chevron-forward" size={20} /></Row><Txt muted size={14}>{shortcut.detail}</Txt></Card></Pressable>)}</View>
    <DashboardActivity />
    {has('report') && <LinkRow title="Urgent Fault Report" detail="Identify equipment and record an urgent fault" icon="alert-circle-outline" onPress={() => go('emergency')} />}
    {has('report') && clinician && <LinkRow title="Report synchronization" icon="sync-outline" onPress={() => go('sync')} />}
  </Screen>;
}

function DashboardActivity() {
  const page = usePaginatedQuery(staffApi.workflows.inbox, {}, { initialNumItems: 3 });
  return <View style={{ gap: 12, marginTop: 8 }}><Row style={{ justifyContent: 'space-between' }}><Txt size={21} weight="700">Recent Activity</Txt><Pressable accessibilityRole="button" accessibilityLabel="View all activity" onPress={() => router.push('/workspace/notifications')} style={{ minHeight: 48, justifyContent: 'center' }}><Txt color="#0866E8">View All</Txt></Pressable></Row>{page.status === 'LoadingFirstPage' ? <Notice>Loading your activity…</Notice> : page.results.length ? page.results.map((item) => <LinkRow key={item._id} title={item.title} detail={`${item.body}\n${new Date(item.createdAt).toLocaleString()}`} icon={item.targetKind === 'task' ? 'construct-outline' : 'document-text-outline'} onPress={() => go(item.targetKind === 'task' ? 'live-task' : item.targetKind === 'report' ? 'report-detail' : 'live-equipment', item.targetId)} />) : <Card><Txt muted>No activity in your inbox yet.</Txt></Card>}</View>;
}
