export type ExportPage = { isDone: boolean; continueCursor: string; csv: string; count: number; ids: string[] };
/** All pages or an explicit failure; partial output is never labelled a complete export. */
export async function collectReportExport(read: (cursor: string | null) => Promise<ExportPage>, current: () => boolean = () => true) {
  let cursor: string | null = null, count = 0, bytes = 0;
  const parts = ["Report,Equipment,Category,Priority"], ids = new Set<string>(), cursors = new Set<string>();
  do {
    if (!current()) throw Error("Export stopped because the authorized session changed.");
    const page = await read(cursor);
    if (!current()) throw Error("Export stopped because the authorized session changed.");
    if (page.count !== page.ids.length || page.ids.some((id) => ids.has(id)) || new Set(page.ids).size !== page.ids.length) throw Error("Records changed or repeated while exporting. Generate a fresh export.");
    for (const id of page.ids) ids.add(id);
    count += page.count; bytes += new TextEncoder().encode(page.csv).length;
    if (bytes > 20 * 1024 * 1024) throw Error("This export exceeds the device's 20 MB memory budget. Choose a narrower date range; no partial export was accepted.");
    if (page.csv) parts.push(page.csv);
    if (page.isDone) return { count, csv: parts.join("\r\n") };
    if (!page.continueCursor || cursors.has(page.continueCursor)) throw Error("Export pagination did not progress; no partial export was accepted.");
    cursor = page.continueCursor; cursors.add(cursor);
  } while (true);
}
