/**
 * Pure reordering helpers for list manipulation with bounds checking.
 */

export function reorderArray<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    fromIndex >= list.length ||
    toIndex < 0 ||
    toIndex >= list.length ||
    fromIndex === toIndex
  ) {
    return list;
  }
  const result = [...list];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

export function moveToFirst<T>(list: T[], fromIndex: number): T[] {
  return reorderArray(list, fromIndex, 0);
}

export function moveToLast<T>(list: T[], fromIndex: number): T[] {
  return reorderArray(list, fromIndex, list.length - 1);
}

export function moveEarlier<T>(list: T[], index: number): T[] {
  return reorderArray(list, index, index - 1);
}

export function moveLater<T>(list: T[], index: number): T[] {
  return reorderArray(list, index, index + 1);
}

export function clampPosition(position1Indexed: number, totalPages: number): number {
  if (isNaN(position1Indexed)) return 1;
  return Math.max(1, Math.min(Math.round(position1Indexed), totalPages));
}
