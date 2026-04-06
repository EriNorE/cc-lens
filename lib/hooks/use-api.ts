import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

/** Shared SWR hook for cc-lens API endpoints — 5s polling, typed response */
export function useAPI<T>(path: string, refreshInterval = 5_000) {
  return useSWR<T>(path, fetcher, { refreshInterval });
}
