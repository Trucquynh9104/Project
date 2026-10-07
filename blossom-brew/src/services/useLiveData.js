import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { subscribeUser, getDataVersion } from "./dataStore";
// Refresh records after server responses without remounting forms or losing edits.
export function useLiveData(read) {
  const reader = useRef(read);
  reader.current = read;
  const [value, setValue] = useState(read);
  useEffect(() => subscribeUser(() => setValue(reader.current())), []);
  return [value, setValue];
}
export function useDataVersion() {
  return useSyncExternalStore(subscribeUser, getDataVersion, getDataVersion);
}
