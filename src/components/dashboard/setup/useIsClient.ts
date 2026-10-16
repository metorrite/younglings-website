import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False while a page is rendered on the server and while it hydrates, true after: for anything that depends on the viewer's own time zone or locale. */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
