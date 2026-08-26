import { useState } from "react";

/** Keeps AI-import checkbox state separate from the broader workspace view state. */
export function useTripImportSelection() {
  const [selectedImports, setSelectedImports] = useState<Record<string, boolean>>({});
  const toggleImport = (id: string) => setSelectedImports((current) => ({ ...current, [id]: !current[id] }));
  const toggleImports = (ids: string[]) => setSelectedImports((current) => {
    const nextValue = !ids.every((id) => current[id]);
    return { ...current, ...Object.fromEntries(ids.map((id) => [id, nextValue])) };
  });
  return { selectedImports, toggleImport, toggleImports };
}
