import { useState } from "react";

/** Keeps AI-import checkbox state separate from the broader workspace view state. */
export function useTripImportSelection() {
  const [selectedImports, setSelectedImports] = useState<Record<string, boolean>>({});
  const toggleImport = (id: string) => setSelectedImports((current) => ({ ...current, [id]: !current[id] }));
  return { selectedImports, toggleImport };
}
