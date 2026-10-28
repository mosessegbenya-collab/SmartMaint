/** Reauthorize after an asynchronous destination dialog, before writing content. */
export async function deliverAuthorizedExport<Destination>(options: {
  current: () => boolean;
  authorize: () => Promise<void>;
  chooseDestination: () => Promise<Destination | null>;
  write: (destination: Destination) => Promise<void>;
}): Promise<"cancelled" | "written"> {
  const check = () => { if (!options.current()) throw Error("Export stopped because the authorized session or selection changed."); };
  check();
  await options.authorize();
  check();
  const destination = await options.chooseDestination();
  check();
  if (destination === null) return "cancelled";
  await options.authorize();
  check();
  await options.write(destination);
  // The file may already be handed to the system at this point. Never report
  // cancellation or promise to retract a completed external write.
  return "written";
}
