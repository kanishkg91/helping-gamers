import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Dataset } from '../core/types';
import type { PublisherStats, GraveyardTotals } from '../core/publisherStats';
import { computeAllPublisherStats, computeGraveyardTotals } from '../core/publisherStats';
import { bundledDataset, loadDataset, type DatasetSource } from '../services/datasetLoader';
import { applyAging } from '../core/aging';

export interface AppData {
  dataset: Dataset;
  source: DatasetSource;
  /** ISO date (YYYY-MM-DD) used consistently for all scoring this session. */
  nowISO: string;
  publisherStats: Map<string, PublisherStats>;
  graveyardTotals: GraveyardTotals;
}

const nowISO = new Date().toISOString().slice(0, 10);

function derive(dataset: Dataset, source: DatasetSource): AppData {
  return {
    dataset,
    source,
    nowISO,
    publisherStats: computeAllPublisherStats(dataset, nowISO),
    graveyardTotals: computeGraveyardTotals(dataset.graveyard, nowISO),
  };
}

const initial = derive(applyAging(bundledDataset, nowISO), 'bundled');

const DataContext = createContext<AppData>(initial);

/**
 * Provides the dataset app-wide. Renders instantly from the bundled snapshot
 * (aged client-side), then swaps in the fresher remote dataset when the
 * fetch lands — no loading spinner, no layout shift beyond numbers updating.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(initial);

  useEffect(() => {
    let cancelled = false;
    loadDataset(nowISO).then(({ dataset, source }) => {
      if (!cancelled && source === 'remote') setData(derive(dataset, source));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
}

export function useAppData(): AppData {
  return useContext(DataContext);
}

/** Convenience: publisher display name with graceful fallback. */
export function usePublisherName(publisherId: string): string {
  const { dataset } = useAppData();
  return useMemo(
    () => dataset.publishers.find((p) => p.id === publisherId)?.name ?? 'Unknown publisher',
    [dataset, publisherId],
  );
}
