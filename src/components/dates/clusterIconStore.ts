// Cache a nivel de módulo de iconos de cluster generados en runtime
// (count -> file:// uri capturado por ClusterIconFactory). Sobrevive
// remounts del screen: cada count se captura una sola vez por sesión.

const icons = new Map<number, string>();
const pending = new Set<number>();
const listeners = new Set<() => void>();

// Snapshot con referencia estable para useSyncExternalStore.
let pendingSnapshot: number[] = [];

function emit() {
  pendingSnapshot = Array.from(pending);
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getClusterIconUri(count: number): string | undefined {
  return icons.get(count);
}

export function getPendingCounts(): number[] {
  return pendingSnapshot;
}

export function requestClusterIcon(count: number): void {
  if (icons.has(count) || pending.has(count)) {
    return;
  }
  pending.add(count);
  emit();
}

export function resolveClusterIcon(count: number, uri: string): void {
  pending.delete(count);
  icons.set(count, uri);
  emit();
}

export function failClusterIcon(count: number): void {
  pending.delete(count);
  emit();
}
