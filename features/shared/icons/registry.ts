import { ClearIcon } from "./ClearIcon";
import { ChevronLeftIcon } from "./ChevronLeftIcon";
import { ChevronRightIcon } from "./ChevronRightIcon";
import { CloseIcon } from "./CloseIcon";
import { EditIcon } from "./EditIcon";
import { MenuIcon } from "./MenuIcon";
import { PlusIcon } from "./PlusIcon";
import { SendIcon } from "./SendIcon";
import { SwapIcon } from "./SwapIcon";
import { TrashIcon } from "./TrashIcon";

export const ICON_REGISTRY = {
  clear: ClearIcon,
  chevronLeft: ChevronLeftIcon,
  chevronRight: ChevronRightIcon,
  close: CloseIcon,
  edit: EditIcon,
  menu: MenuIcon,
  plus: PlusIcon,
  send: SendIcon,
  swap: SwapIcon,
  trash: TrashIcon,
} as const;

export type IconName = keyof typeof ICON_REGISTRY;
