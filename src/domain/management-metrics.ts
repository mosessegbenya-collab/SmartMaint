export const metricSources = ["equipment", "faultReports", "maintenanceTasks", "safetyHolds", "releaseRecords"] as const;
export type MetricSource = (typeof metricSources)[number];
export const metricKeys = ["equipment", "verifiedIdentities", "incompleteRecords", "reports", "Urgent", "High", "Routine", "completedRepairs", "timedRepairs", "recordedRepairElapsedMs", "openTasks", "activeHolds", "releaseDecisions"] as const;
export type ManagementCounts = Record<(typeof metricKeys)[number], number>;
export type MetricsPage = { isDone: boolean; continueCursor: string; counts: Record<string, number>; ids: string[] };
export type MetricsProgress = { department: number; departments: number; source: MetricSource; records: number };

/** Publish one complete result, or fail. A calculation is not an atomic snapshot. */
export async function collectManagementMetrics<Department extends string>(
  departments: readonly Department[],
  read: (department: Department, source: MetricSource, cursor: string | null) => Promise<MetricsPage>,
  current: () => boolean,
  progress: (value: MetricsProgress) => void = () => {},
): Promise<ManagementCounts> {
  const totals = Object.fromEntries(metricKeys.map(key => [key, 0])) as ManagementCounts;
  if (!departments.length || new Set(departments).size !== departments.length) throw Error("Choose a valid authorized department selection.");
  let records = 0;
  const observed = new Map<MetricSource, Set<string>>();
  for (const [index, department] of departments.entries()) for (const source of metricSources) {
    let cursor: string | null = null;
    const cursors = new Set<string>(), ids = observed.get(source) ?? new Set<string>();
    observed.set(source, ids);
    do {
      if (!current()) throw Error("Calculation stopped because the authorized session changed.");
      progress({ department: index + 1, departments: departments.length, source, records });
      const page = await read(department, source, cursor);
      if (!current()) throw Error("Calculation stopped because the authorized session changed.");
      for (const id of page.ids) {
        if (!id || ids.has(id)) throw Error("Records changed or repeated during calculation. Recalculate before using these totals.");
        ids.add(id);
      }
      for (const [key, value] of Object.entries(page.counts)) {
        if (!metricKeys.includes(key as keyof ManagementCounts) || !Number.isSafeInteger(value) || value < 0) throw Error("The calculation returned invalid counts. Recalculate before using these totals.");
        const metric = key as keyof ManagementCounts;
        totals[metric] += value;
        if (!Number.isSafeInteger(totals[metric])) throw Error("The calculation exceeded the supported count range.");
      }
      records += page.ids.length;
      if (page.isDone) break;
      if (!page.continueCursor || cursors.has(page.continueCursor)) throw Error("Calculation pagination stopped progressing. No partial totals were accepted.");
      cursor = page.continueCursor;
      cursors.add(cursor);
    } while (true);
  }
  if (!current()) throw Error("Calculation stopped because the authorized session changed.");
  if (totals.incompleteRecords > totals.equipment || totals.verifiedIdentities > totals.equipment || totals.timedRepairs > totals.completedRepairs || totals.Urgent + totals.High + totals.Routine !== totals.reports) throw Error("Records changed during calculation. Recalculate before using these totals.");
  return totals;
}
