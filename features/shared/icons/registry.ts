import { ClearIcon } from "./ClearIcon";
import { CloseIcon } from "./CloseIcon";
import { EditIcon } from "./EditIcon";
import { TrashIcon } from "./TrashIcon";

export const ICON_REGISTRY = {
  clear: ClearIcon,
  close: CloseIcon,
  edit: EditIcon,
  trash: TrashIcon,
} as const;

export type IconName = keyof typeof ICON_REGISTRY;
