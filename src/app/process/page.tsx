'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProcessSummary } from '@/components/ProcessSummary';

type StepId = 'capture' | 'stitch' | 'ocr';

type LogEntry = {
  level: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp?: string;
  step?: StepId | string;
};

type StepStatus = 'idle' | 'running' | 'done' | 'error';

type StepConfig = {
  id: StepId;
  title: string;
  description: string;
  icon: string;
  matchers: RegExp[];
};

type BoxDetail = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type SummaryData = {
  window?: { x: number; y: number; width: number; height: number };
  stitched?: {
    width: number;
    height: number;
    filesize_mb?: number;
    imageUrl?: string;
  };
  boxes?: { count: number; boxes: BoxDetail[]; imageUrl?: string };
  ocr?: {
    totalItems?: number;
    firstDate?: string;
    firstDateFound?: boolean;
    resultImageUrl?: string;
  };
};

type PipelineState = {
  grouped: Record<StepId, LogEntry[]>;
  statusByStep: Record<StepId, StepStatus>;
  currentStepIndex: number;
  summaryData: SummaryData;
  pipelineFinished: boolean;
  hasErrors: boolean;
};

type RawOcrItem = {
  name?: string;
  category?: string;
  price?: string;
  tag?: string;
  date?: string;
};

type EditableOcrItemStatus = 'pending' | 'saved' | 'error';

type EditableOcrItem = {
  id: string;
  index: number;
  include: boolean;
  status: EditableOcrItemStatus;
  error?: string;
  name: string;
  category: string;
  tag: string;
  priceRaw: string;
  priceInput: string;
  priceValue: number;
  type: 'income' | 'expense';
  dateRaw: string;
  dateISO: string | null;
  dateEdited: boolean;
};

const STEP_CONFIGS: StepConfig[] = [
  {
    id: 'capture',
    title: 'Screenshots aufnehmen & croppen',
    description: 'capture_and_crop_screenshots() sammelt die Scroll-Sequenz und schneidet sie zu.',
    icon: '📸',
    matchers: [
      /capture/i,
      /screenshot/i,
      /shot_/i,
      /scroll/i,
      /cropp/i,
      /crop/i,
      /✂️/,
      /📸/,
      /fenster/i,
    ],
  },
  {
    id: 'stitch',
    title: 'Scroll-Sequenz zusammenfügen',
    description: 'stitch_scroll_sequence() baut die Crops zu einem langen Bild zusammen.',
    icon: '🧵',
    matchers: [
      /stitch/i,
      /zusammen/i,
      /match score/i,
      /template/i,
      /stitched/i,
      /🧩/,
      /🔗/,
    ],
  },
  {
    id: 'ocr',
    title: 'OCR & Analyse',
    description: 'ocr_extract() erkennt Transaktionen und erstellt das Ergebnis.',
    icon: '🧠',
    matchers: [
      /ocr/i,
      /transaktions/i,
      /item/i,
      /datum/i,
      /pipeline abgeschlossen/i,
      /📅/,
      /📦/,
      /✅/,
    ],
  },
];

const STEP_INDEX_BY_ID: Record<StepId, number> = {
  capture: 0,
  stitch: 1,
  ocr: 2,
};

const RUN_END_MESSAGES = new Set(['✅ Pipeline abgeschlossen', '❌ Pipeline mit Fehler beendet']);
const STREAM_TIMESTAMP_LOCALE = 'de-DE';

function isStepId(value: unknown): value is StepId {
  return value === 'capture' || value === 'stitch' || value === 'ocr';
}

function isRunEndMessage(message?: string) {
  if (!message) return false;
  return RUN_END_MESSAGES.has(message);
}

function normalizeSingleLog(entry: LogEntry, fallback: Partial<LogEntry> = {}): LogEntry {
  const merged: LogEntry = { ...fallback, ...entry };
  const timestamp = typeof merged.timestamp === 'string' ? merged.timestamp : undefined;
  const data =
    merged.data && typeof merged.data === 'object'
      ? (merged.data as Record<string, unknown>)
      : undefined;

  return {
    ...merged,
    timestamp,
    data,
  };
}

function parseEmbeddedPythonOutput(entry: LogEntry): LogEntry | null {
  if (!entry.data || typeof entry.data !== 'object') return null;
  const raw = (entry.data as Record<string, unknown>).output;
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as LogEntry;
    return normalizeSingleLog(parsed, {
      timestamp: entry.timestamp,
      step: entry.step,
    });
  } catch {
    return null;
  }
}

function normalizeLogs(entries: LogEntry[]): LogEntry[] {
  const normalized: LogEntry[] = [];

  entries.forEach((entry) => {
    if (entry.message === 'Python Output') {
      const parsed = parseEmbeddedPythonOutput(entry);
      if (parsed) {
        normalized.push(parsed);
        return;
      }
    }

    normalized.push(normalizeSingleLog(entry));
  });

  return normalized;
}

function formatTimestamp(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(STREAM_TIMESTAMP_LOCALE);
}

function generateItemId(index: number) {
  const cryptoRef = typeof globalThis !== 'undefined' ? (globalThis as typeof globalThis & { crypto?: Crypto }).crypto : undefined;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }
  return `ocr-item-${Date.now()}-${index}`;
}

function parsePrice(value?: string) {
  if (!value) {
    return { amount: 0, type: 'expense' as const };
  }

  const trimmed = value.replace(/\s/g, '');
  const negative = trimmed.includes('-');
  const sanitized = trimmed.replace(/[^\d.,-]/g, '');
  const normalized = sanitized.replace(/\./g, '').replace(',', '.');
  const numeric = Number.parseFloat(normalized);

  if (Number.isNaN(numeric)) {
    return { amount: 0, type: negative ? ('expense' as const) : ('income' as const) };
  }

  const type = negative || numeric < 0 ? ('expense' as const) : ('income' as const);
  return { amount: Math.abs(numeric), type };
}

function parseDateWithYear(value: string | undefined, year: number) {
  if (!value) return null;
  const match = value.match(/(\d{1,2})\.(\d{1,2})/);
  if (!match) return null;

  const day = Number.parseInt(match[1] ?? '', 10);
  const month = Number.parseInt(match[2] ?? '', 10);

  if (!Number.isFinite(day) || !Number.isFinite(month)) return null;

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function formatDateInput(date: Date | null) {
  if (!date) return null;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildEditableItems(rawItems: RawOcrItem[], year: number): EditableOcrItem[] {
  return rawItems.map((item, index) => {
    const priceInfo = parsePrice(item.price);
    const parsedDate = parseDateWithYear(item.date, year);

    return {
      id: generateItemId(index),
      index,
      include: true,
      status: 'pending',
      error: undefined,
      name: (item.name ?? '').trim(),
      category: (item.category ?? '').trim(),
      tag: (item.tag ?? '').trim(),
      priceRaw: item.price ?? '',
      priceInput:
        priceInfo.amount > 0 ? priceInfo.amount.toFixed(2).replace('.', ',') : '',
      priceValue: priceInfo.amount,
      type: priceInfo.type,
      dateRaw: item.date ?? '',
      dateISO: formatDateInput(parsedDate),
      dateEdited: false,
    };
  });
}

function updateItemsForYear(items: EditableOcrItem[], year: number) {
  return items.map((item) => {
    if (item.dateEdited) return item;
    const parsedDate = parseDateWithYear(item.dateRaw, year);
    return {
      ...item,
      dateISO: formatDateInput(parsedDate),
    };
  });
}

function normalizePriceInput(input: string, currentType: 'income' | 'expense') {
  const trimmed = input.trim();
  if (!trimmed) {
    return { amount: 0, type: currentType };
  }

  const negative = trimmed.includes('-');
  const sanitized = trimmed.replace(/[^\d.,-]/g, '');
  const normalized = sanitized.replace(/\./g, '').replace(',', '.');
  const numeric = Number.parseFloat(normalized);

  if (Number.isNaN(numeric)) {
    return { amount: 0, type: currentType };
  }

  const type = negative || numeric < 0 ? ('expense' as const) : currentType;
  return { amount: Math.abs(numeric), type };
}

function extractLatestRun(allLogs: LogEntry[]) {
  if (!Array.isArray(allLogs) || allLogs.length === 0) {
    return [];
  }

  const runs: LogEntry[][] = [];
  let current: LogEntry[] = [];

  allLogs.forEach((log) => {
    current.push(log);
    if (isRunEndMessage(log.message)) {
      runs.push(current);
      current = [];
    }
  });

  if (current.length > 0) {
    runs.push(current);
  }

  if (runs.length === 0) return [];

  let candidate = runs[runs.length - 1];
  if (
    candidate?.length === 1 &&
    candidate[0]?.data &&
    typeof (candidate[0].data as { exitCode?: unknown }).exitCode !== 'undefined'
  ) {
    candidate = runs[runs.length - 2] ?? candidate;
  }

  return candidate ?? [];
}

function matchStepIndex(log: LogEntry): number | null {
  if (isStepId(log.step)) {
    return STEP_INDEX_BY_ID[log.step];
  }

  const message = log.message ?? '';

  for (let index = 0; index < STEP_CONFIGS.length; index += 1) {
    const config = STEP_CONFIGS[index];
    const matched = config.matchers.some((regex) => regex.test(message));
    if (matched) return index;
  }

  if (log.level === 'summary') {
    if (message.includes('Finanzguru')) return 0;
    if (message.includes('Zusammengesetztes Bild')) return 1;
    if (message.includes('Transaktionsboxen')) return 2;
  }

  if (log.level === 'error') {
    const errorText = (log.data as Record<string, unknown> | undefined)?.error;
    if (typeof errorText === 'string') {
      if (/capture/i.test(errorText)) return 0;
      if (/stitch/i.test(errorText)) return 1;
      if (/ocr/i.test(errorText)) return 2;
    }
  }

  return null;
}

function clampIndex(index: number) {
  if (index < 0) return 0;
  if (index >= STEP_CONFIGS.length) return STEP_CONFIGS.length - 1;
  return index;
}

function resolveStepIndex(log: LogEntry, currentIndex: number) {
  const matched = matchStepIndex(log);
  if (matched !== null) return clampIndex(matched);
  if (currentIndex >= 0) return clampIndex(currentIndex);
  return 0;
}

function buildSummaryData(logs: LogEntry[]): SummaryData {
  return logs.reduce<SummaryData>((acc, log) => {
    const next: SummaryData = { ...acc };
    const data = log.data as Record<string, unknown> | undefined;

    if (log.level === 'summary') {
      if (log.message === '🖥️ Finanzguru-Fenster') {
        const xValue = data?.x;
        const yValue = data?.y;
        const widthValue = data?.width;
        const heightValue = data?.height;

        next.window = {
          x: typeof xValue === 'number' ? xValue : next.window?.x ?? 0,
          y: typeof yValue === 'number' ? yValue : next.window?.y ?? 0,
          width: typeof widthValue === 'number' ? widthValue : next.window?.width ?? 0,
          height: typeof heightValue === 'number' ? heightValue : next.window?.height ?? 0,
        };
      } else if (log.message === '🧩 Zusammengesetztes Bild') {
        const ts = Date.now();
        const widthValue = data?.width;
        const heightValue = data?.height;
        const sizeValue = data?.filesize_mb;
        next.stitched = {
          width: typeof widthValue === 'number' ? widthValue : next.stitched?.width ?? 0,
          height: typeof heightValue === 'number' ? heightValue : next.stitched?.height ?? 0,
          filesize_mb: typeof sizeValue === 'number' ? sizeValue : next.stitched?.filesize_mb,
          imageUrl: `/api/process/media/stitched.png?ts=${ts}`,
        };
      } else if (log.message === '📦 Transaktionsboxen') {
        const countValue = data?.count;
        const boxesValue = data?.boxes;

        const prevBoxes = next.boxes;
        let boxes: BoxDetail[] = prevBoxes?.boxes ?? [];
        if (Array.isArray(boxesValue)) {
          boxes = boxesValue
            .flatMap((item) => {
              if (!item || typeof item !== 'object') return [];
              const record = item as Record<string, unknown>;
              const xVal = record.x;
              const yVal = record.y;
              const wVal = record.w;
              const hVal = record.h;
              if (
                typeof xVal === 'number' &&
                typeof yVal === 'number' &&
                typeof wVal === 'number' &&
                typeof hVal === 'number'
              ) {
                return [{ x: xVal, y: yVal, w: wVal, h: hVal }];
              }
              return [];
            })
            .slice(0, 5);
        }

        next.boxes = {
          count: typeof countValue === 'number' ? countValue : prevBoxes?.count ?? boxes.length,
          boxes,
          imageUrl: prevBoxes?.imageUrl ?? next.ocr?.resultImageUrl,
        };
      }
    } else if (log.level === 'info') {
      if (log.message === '📅 Erstes Datum erkannt') {
        const firstDateRaw = data?.date;
        const firstDate = typeof firstDateRaw === 'string' ? firstDateRaw.trim() : '';
        next.ocr = {
          ...next.ocr,
          firstDate,
          firstDateFound: Boolean(firstDate),
        };
      } else if (log.message === '✅ OCR Pipeline abgeschlossen') {
        const ts = Date.now();
        const resultImageUrl = `/api/process/media/ocr_result.png?ts=${ts}`;
        const totalItemsValue = data?.total_items;
        next.ocr = {
          ...next.ocr,
          totalItems:
            typeof totalItemsValue === 'number' ? totalItemsValue : next.ocr?.totalItems,
          resultImageUrl,
        };
        if (next.boxes) {
          next.boxes = { ...next.boxes, imageUrl: resultImageUrl };
        }
      }
    }

    return next;
  }, {});
}

function derivePipelineState(logs: LogEntry[]): PipelineState {
  const grouped: Record<StepId, LogEntry[]> = {
    capture: [],
    stitch: [],
    ocr: [],
  };

  let currentIndex = -1;
  let pipelineFinished = false;
  const errors = new Set<StepId>();

  logs.forEach((log) => {
    const stepIndex = resolveStepIndex(log, currentIndex);
    currentIndex = Math.max(currentIndex, stepIndex);
    const step = STEP_CONFIGS[stepIndex] ?? STEP_CONFIGS[STEP_CONFIGS.length - 1];
    grouped[step.id].push(log);

    if (log.level === 'error') {
      errors.add(step.id);
    }

    if (isRunEndMessage(log.message)) {
      pipelineFinished = true;
    }
  });

  if (currentIndex === -1) {
    currentIndex = 0;
  }

  const hasErrors = errors.size > 0;

  const statusByStep: Record<StepId, StepStatus> = {
    capture: 'idle',
    stitch: 'idle',
    ocr: 'idle',
  };

  STEP_CONFIGS.forEach((step, index) => {
    const hasLogEntries = grouped[step.id].length > 0;
    let status: StepStatus = 'idle';

    if (errors.has(step.id)) {
      status = 'error';
    } else if (pipelineFinished && !hasErrors && hasLogEntries) {
      status = 'done';
    } else if (index < currentIndex && hasLogEntries) {
      status = 'done';
    } else if (index === currentIndex && hasLogEntries) {
      status = hasErrors ? 'error' : 'running';
    } else if (hasLogEntries) {
      status = 'running';
    }

    statusByStep[step.id] = status;
  });

  return {
    grouped,
    statusByStep,
    currentStepIndex: clampIndex(currentIndex),
    summaryData: buildSummaryData(logs),
    pipelineFinished,
    hasErrors,
  };
}

const STATUS_LABEL: Record<StepStatus, string> = {
  idle: 'Wartet',
  running: 'Läuft',
  done: 'Fertig',
  error: 'Fehler',
};

const STATUS_STYLES: Record<StepStatus, string> = {
  idle: 'border-slate-700 bg-slate-900 text-slate-400',
  running: 'border-sky-400/60 bg-sky-500/10 text-sky-200',
  done: 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200',
  error: 'border-rose-500/60 bg-rose-500/10 text-rose-200',
};

export default function ProcessPage() {
  const router = useRouter();
  const eventSourceRef = useRef<EventSource | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<StepId | null>(null);
  const [ocrItems, setOcrItems] = useState<EditableOcrItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [itemsMessage, setItemsMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [itemsYear, setItemsYear] = useState(() => new Date().getFullYear());

  const itemsYearRef = useRef(itemsYear);
  useEffect(() => {
    itemsYearRef.current = itemsYear;
  }, [itemsYear]);

  const loadOcrItems = useCallback(async () => {
    setIsLoadingItems(true);
    setItemsError(null);
    setItemsMessage(null);
    try {
      const response = await fetch('/api/process/items', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Fehler beim Laden der OCR Items');
      }

      const payload = await response.json();
      const rawItems: RawOcrItem[] = Array.isArray(payload?.items) ? payload.items : [];
      const yearToUse = itemsYearRef.current || new Date().getFullYear();

      if (rawItems.length === 0) {
        setOcrItems([]);
        setItemsMessage('Keine OCR Items vorhanden.');
      } else {
        setOcrItems(buildEditableItems(rawItems, yearToUse));
        setItemsMessage(null);
      }
    } catch (error) {
      console.warn('⚠️ OCR Items konnten nicht geladen werden:', error);
      setItemsError(error instanceof Error ? error.message : 'Fehler beim Laden der OCR Items');
    } finally {
      setIsLoadingItems(false);
    }
  }, []);

  const updateItem = useCallback((id: string, updater: (item: EditableOcrItem) => EditableOcrItem) => {
    setOcrItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = updater(item);
        return { ...next, status: 'pending', error: undefined };
      }),
    );
  }, []);

  const handleIncludeToggle = useCallback(
    (id: string) => {
      updateItem(id, (item) => ({ ...item, include: !item.include }));
    },
    [updateItem],
  );

  const handleItemFieldChange = useCallback(
    (id: string, field: 'name' | 'category' | 'tag', value: string) => {
      updateItem(id, (item) => ({ ...item, [field]: value }));
    },
    [updateItem],
  );

  const handleItemPriceChange = useCallback(
    (id: string, value: string) => {
      updateItem(id, (item) => {
        const normalized = normalizePriceInput(value, item.type);
        return {
          ...item,
          priceInput: value,
          priceValue: normalized.amount,
          type: normalized.amount === 0 ? item.type : normalized.type,
        };
      });
    },
    [updateItem],
  );

  const handleItemTypeChange = useCallback(
    (id: string, type: 'income' | 'expense') => {
      updateItem(id, (item) => ({ ...item, type }));
    },
    [updateItem],
  );

  const handleItemDateChange = useCallback(
    (id: string, value: string) => {
      updateItem(id, (item) => ({
        ...item,
        dateISO: value || null,
        dateEdited: true,
      }));
    },
    [updateItem],
  );

  const handleYearChange = useCallback((value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return;
    }
    setItemsYear(parsed);
    setOcrItems((prev) => updateItemsForYear(prev, parsed));
  }, []);

  const hasImportableItems = useMemo(
    () =>
      ocrItems.some(
        (item) =>
          item.include && item.name.trim() && item.priceValue > 0 && item.dateISO && item.type,
      ),
    [ocrItems],
  );

  const handleImport = useCallback(async () => {
    const candidates = ocrItems.filter(
      (item) =>
        item.include && item.name.trim() && item.priceValue > 0 && item.dateISO && item.type,
    );

    if (candidates.length === 0) {
      setItemsError('Keine gültigen Items zum Import ausgewählt.');
      return;
    }

    setIsImporting(true);
    setItemsError(null);
    setItemsMessage(null);

    try {
      const response = await fetch('/api/process/items/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: candidates.map((item) => ({
            id: item.id,
            name: item.name.trim(),
            category: item.category.trim(),
            tag: item.tag.trim(),
            type: item.type,
            price: Number(item.priceValue.toFixed(2)),
            date: item.dateISO,
            description: item.name.trim(),
          })),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Import fehlgeschlagen.');
      }

      const importedCount =
        typeof payload?.imported === 'number' ? payload.imported : candidates.length;
      const importedIds = new Set(candidates.map((item) => item.id));

      setOcrItems((prev) =>
        prev.map((item) =>
          importedIds.has(item.id)
            ? {
                ...item,
                status: 'saved',
                include: false,
              }
            : item,
        ),
      );

      setItemsMessage(`Import abgeschlossen: ${importedCount} Einträge gespeichert.`);
    } catch (error) {
      console.error('Import fehlgeschlagen', error);
      setItemsError(error instanceof Error ? error.message : 'Import fehlgeschlagen.');
    } finally {
      setIsImporting(false);
    }
  }, [ocrItems]);

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const loadLatestLogs = useCallback(async () => {
    setFetchError(null);
    try {
      const response = await fetch('/api/process/logs', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Logs');
      }

      const payload = (await response.json()) as LogEntry[];
      const normalized = normalizeLogs(payload);
      const latestRun = extractLatestRun(normalized);

      setLogs(latestRun);
      setIsRunning(false);
      const now = new Date().toISOString();
      setLastEventAt(now);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setFetchError(error.message);
      } else {
        setFetchError('Fehler beim Laden der Logs');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLatestLogs();
    loadOcrItems();
    return () => {
      closeEventSource();
    };
  }, [closeEventSource, loadLatestLogs, loadOcrItems]);

  const handleStartPipeline = useCallback(() => {
    if (isRunning) return;

    closeEventSource();
    setFetchError(null);
    setLogs([]);
    setIsRunning(true);

    const eventSource = new EventSource('/api/process');
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as LogEntry;
        const enriched: LogEntry = parsed.timestamp
          ? parsed
          : { ...parsed, timestamp: new Date().toISOString() };
        const normalizedBatch = normalizeLogs([enriched]);
        if (normalizedBatch.length === 0) return;

        setLogs((prev) => [...prev, ...normalizedBatch]);
        setLastEventAt(new Date().toISOString());

        if (isRunEndMessage(enriched.message)) {
          setIsRunning(false);
          closeEventSource();
          // kurze Pause, damit die Datei sicher geschrieben ist
          setTimeout(() => {
            loadLatestLogs();
            loadOcrItems();
          }, 400);
        }
      } catch (error) {
        console.warn('⚠️ Konnte Log nicht parsen:', error);
      }
    };

    eventSource.onerror = () => {
      setFetchError('SSE-Verbindung unterbrochen');
      setIsRunning(false);
      closeEventSource();
    };
  }, [closeEventSource, isRunning, loadLatestLogs, loadOcrItems]);

  const pipelineState = useMemo(() => derivePipelineState(logs), [logs]);

  const stepCards = useMemo(
    () =>
      STEP_CONFIGS.map((step, index) => ({
        index,
        step,
        logs: pipelineState.grouped[step.id],
        status: pipelineState.statusByStep[step.id],
      })),
    [pipelineState.grouped, pipelineState.statusByStep],
  );

  const selectedStep = useMemo(
    () => stepCards.find((card) => card.step.id === selectedStepId) ?? null,
    [selectedStepId, stepCards],
  );

  const hasErrors = pipelineState.hasErrors || stepCards.some((card) => card.status === 'error');
  const pipelineFinished = pipelineState.pipelineFinished && !isRunning;

  const headerStatus = (() => {
    if (isRunning) {
      return {
        label: 'Pipeline läuft',
        className:
          'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 shadow-[0_0_30px_-15px] shadow-emerald-500/40',
      };
    }
    if (hasErrors) {
      return {
        label: 'Fehler erkannt',
        className: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
      };
    }
    return null;
  })();

  const latestLogTimestamp = useMemo(() => {
    for (let index = logs.length - 1; index >= 0; index -= 1) {
      const entry = logs[index];
      if (!entry.timestamp) continue;
      const parsed = new Date(entry.timestamp);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
    return null;
  }, [logs]);

  const formattedLastAdded =
    latestLogTimestamp
      ? new Date(latestLogTimestamp).toLocaleTimeString(STREAM_TIMESTAMP_LOCALE)
      : lastEventAt
        ? new Date(lastEventAt).toLocaleTimeString(STREAM_TIMESTAMP_LOCALE)
        : null;

  return (
    <main className="min-h-screen bg-slate-950 py-12 px-6 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-6 rounded-3xl border border-slate-800/60 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/40 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                Pipeline Control
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-50">
                🛠️ Process Monitor
              </h1>
              <p className="mt-3 max-w-xl text-sm text-slate-400">
                Greife auf die gespeicherten JSON-Logs der Python-Pipeline zu, starte neue
                Durchläufe manuell und inspiziere die Schritte einzeln.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {formattedLastAdded && (
                <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 font-mono tracking-widest text-slate-300">
                  Zuletzt hinzugefügt: {formattedLastAdded}
                </span>
              )}
            </div>

            {fetchError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
                {fetchError}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            {headerStatus && (
              <div
                className={`flex items-center gap-2 rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition-colors duration-300 ${headerStatus.className}`}
              >
                <span>{headerStatus.label}</span>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleStartPipeline}
                disabled={isRunning}
                className={`rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition-colors duration-300 ${
                  isRunning
                    ? 'cursor-not-allowed border-slate-700 bg-slate-900/60 text-slate-500'
                    : 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-50'
                }`}
              >
                🚀 OCR manuell starten
              </button>

              <button
                type="button"
                onClick={() => router.push('/')}
                className="rounded-full border border-slate-700 bg-slate-900/60 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200 transition-colors duration-300 hover:border-slate-500 hover:bg-slate-800"
              >
                🏠 Zum Dashboard
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-800/60 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/40">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-50">Pipeline Schritte</h2>
              <p className="text-sm text-slate-400">
                Die drei Hauptphasen der Pipeline nutzen die gespeicherten Logs aus{' '}
                <code className="rounded bg-slate-900 px-1 py-0.5 text-[11px] text-slate-300">
                  data/process-log.jsonl
                </code>
                . Tippe auf eine Karte, um alle Einträge zu sehen.
              </p>
            </div>
            {isLoading && (
              <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs uppercase tracking-[0.35em] text-slate-400">
                Lädt…
              </span>
            )}
          </div>

          <section className="grid gap-y-16 md:grid-cols-[220px_1fr] md:gap-x-12">
            {stepCards.map(({ index, step, logs: stepLogs, status }) => {
              const isActive = status === 'running';
              const isDone = status === 'done';
              const isError = status === 'error';
              const isLast = index === stepCards.length - 1;
              const lastLog = stepLogs[stepLogs.length - 1];
              const displayLog = (() => {
                if (lastLog) return lastLog.message;
                if (isActive) return '⏳ Wird ausgeführt…';
                if (isDone) return '✅ Schritt abgeschlossen.';
                if (isError) return '❌ Schritt mit Fehler beendet.';
                return '⏳ Noch nicht gestartet.';
              })();

              const connectorFill =
                status === 'done' ? 100 : status === 'running' ? 55 : status === 'error' ? 20 : 0;

              return (
                <Fragment key={step.id}>
                  <div className="relative flex flex-col items-center pb-20 md:pb-24">
                    <div
                      className={[
                        'flex h-16 w-16 items-center justify-center rounded-full border-4 text-xl font-semibold transition-all duration-500',
                        isError
                          ? 'border-rose-400 bg-rose-500/20 text-rose-100'
                          : isDone
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                            : isActive
                              ? 'border-sky-400 bg-sky-500/20 text-sky-100 animate-pulse'
                              : 'border-slate-700 bg-slate-900 text-slate-300',
                      ].join(' ')}
                    >
                      {step.icon}
                    </div>

                    {!isLast && (
                      <div className="absolute left-1/2 top-16 bottom-[-6rem] w-[3px] -translate-x-1/2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="absolute inset-x-0 top-0 w-full bg-gradient-to-b from-cyan-400 via-sky-400 to-blue-500 transition-all duration-700"
                          style={{ height: `${connectorFill}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <article
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedStepId(step.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedStepId(step.id);
                      }
                    }}
                    className={[
                      'relative cursor-pointer rounded-2xl border px-6 py-7 shadow-lg transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:hover:-translate-y-1',
                      isError
                        ? 'border-rose-500/60 bg-rose-500/10 shadow-rose-900/40'
                        : isActive
                          ? 'border-sky-400/60 bg-slate-900/70 shadow-sky-900/60'
                          : isDone
                            ? 'border-emerald-500/40 bg-slate-900/60'
                            : 'border-slate-800 bg-slate-900/40 opacity-80',
                    ].join(' ')}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-50">
                          {index + 1}. {step.title}
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">{step.description}</p>
                      </div>

                      <span
                        className={[
                          'shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest',
                          STATUS_STYLES[status],
                        ].join(' ')}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                    </div>

                    <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-5 text-sm leading-relaxed text-slate-200">
                      {displayLog}
                    </div>

                    <p className="mt-3 text-[11px] uppercase tracking-[0.35em] text-slate-500">
                      {stepLogs.length} Log-Einträge
                    </p>
                  </article>
                </Fragment>
              );
            })}
          </section>

          {!isLoading && logs.length === 0 && (
            <div className="mt-16 rounded-2xl border border-slate-800 bg-slate-950/70 p-8 text-center text-slate-400">
              Noch keine Logs vorhanden. Starte die Pipeline, um neue Einträge zu erzeugen.
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-800/60 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/40">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-50">OCR Ergebnisse prüfen</h2>
              <p className="text-sm text-slate-400">
                Überprüfe die erkannten Transaktionen, passe sie bei Bedarf an und übernimm sie
                erst danach in die Datenbank.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-end gap-2">
                <label className="flex flex-col text-xs uppercase tracking-[0.35em] text-slate-500">
                  Jahr für Datumszuordnung
                  <input
                    type="number"
                    value={itemsYear}
                    min={2000}
                    max={2100}
                    onChange={(event) => handleYearChange(event.target.value)}
                    className="mt-2 w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={loadOcrItems}
                  className="h-10 rounded-full border border-slate-700 bg-slate-900/60 px-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300 transition-colors duration-300 hover:border-slate-500 hover:bg-slate-800"
                >
                  🔄 Neu laden
                </button>
              </div>

              <button
                type="button"
                onClick={handleImport}
                disabled={!hasImportableItems || isImporting}
                className={`h-10 rounded-full border px-5 text-xs font-semibold uppercase tracking-[0.35em] transition-colors duration-300 ${
                  !hasImportableItems || isImporting
                    ? 'cursor-not-allowed border-slate-700 bg-slate-900/60 text-slate-500'
                    : 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-50'
                }`}
              >
                💾 In DB übernehmen
              </button>
            </div>
          </div>

          {isLoadingItems && (
            <div className="mb-4 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 text-center text-sm text-slate-400">
              OCR-Ergebnisse werden geladen…
            </div>
          )}

          {itemsError && (
            <div className="mb-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
              {itemsError}
            </div>
          )}

          {itemsMessage && !isLoadingItems && (
            <div className="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              {itemsMessage}
            </div>
          )}

          {!isLoadingItems && ocrItems.length === 0 && !itemsError && (
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-8 text-center text-slate-400">
              Aktuell liegen keine OCR-Ergebnisse vor. Starte die Pipeline oder lade die Daten neu.
            </div>
          )}

          {!isLoadingItems && ocrItems.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-300">
                <thead>
                  <tr className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                    <th className="px-4 py-3">Import</th>
                    <th className="px-4 py-3">Datum</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Kategorie</th>
                    <th className="px-4 py-3">Preis</th>
                    <th className="px-4 py-3">Typ</th>
                    <th className="px-4 py-3">Tag</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {ocrItems.map((item) => (
                    <tr key={item.id} className="align-top transition-colors duration-150 hover:bg-slate-900/60">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={item.include}
                          onChange={() => handleIncludeToggle(item.id)}
                          className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-400 focus:ring-emerald-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="date"
                          value={item.dateISO ?? ''}
                          onChange={(event) => handleItemDateChange(item.id, event.target.value)}
                          className="w-40 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                        />
                        {item.dateRaw && (
                          <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-slate-500">
                            Raw: {item.dateRaw}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(event) => handleItemFieldChange(item.id, 'name', event.target.value)}
                          className="w-48 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.category}
                          onChange={(event) =>
                            handleItemFieldChange(item.id, 'category', event.target.value)
                          }
                          className="w-44 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.priceInput}
                          placeholder={item.priceRaw || '0,00'}
                          onChange={(event) => handleItemPriceChange(item.id, event.target.value)}
                          className="w-28 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                        />
                        {item.priceRaw && (
                          <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-slate-500">
                            Raw: {item.priceRaw}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="inline-flex overflow-hidden rounded-full border border-slate-700 bg-slate-900">
                          <button
                            type="button"
                            onClick={() => handleItemTypeChange(item.id, 'expense')}
                            className={`px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition-colors ${
                              item.type === 'expense'
                                ? 'bg-rose-500/20 text-rose-200'
                                : 'text-slate-400 hover:text-rose-200'
                            }`}
                          >
                            Expense
                          </button>
                          <button
                            type="button"
                            onClick={() => handleItemTypeChange(item.id, 'income')}
                            className={`px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition-colors ${
                              item.type === 'income'
                                ? 'bg-emerald-500/20 text-emerald-200'
                                : 'text-slate-400 hover:text-emerald-200'
                            }`}
                          >
                            Income
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.tag}
                          onChange={(event) => handleItemFieldChange(item.id, 'tag', event.target.value)}
                          className="w-40 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${
                            item.status === 'saved'
                              ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                              : item.status === 'error'
                                ? 'border border-rose-500/40 bg-rose-500/10 text-rose-200'
                                : 'border border-slate-700/60 bg-slate-900/60 text-slate-400'
                          }`}
                        >
                          {item.status === 'saved'
                            ? 'Gespeichert'
                            : item.status === 'error'
                              ? 'Fehler'
                              : 'Offen'}
                        </span>
                        {item.error && (
                          <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-rose-300">
                            {item.error}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <ProcessSummary summaryData={pipelineState.summaryData} />
      </div>

      {selectedStep && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6 backdrop-blur-sm"
          onClick={() => setSelectedStepId(null)}
        >
          <div
            className="relative w-full max-w-4xl rounded-3xl border border-slate-800/70 bg-slate-900/95 p-6 shadow-2xl shadow-black/40"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedStepId(null)}
              className="absolute right-4 top-4 rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-300 transition-colors duration-300 hover:border-slate-500 hover:bg-slate-800"
            >
              Schließen
            </button>

            <h3 className="text-lg font-semibold text-slate-50">
              {selectedStep.index + 1}. {selectedStep.step.title}
            </h3>
            <p className="mt-1 text-sm text-slate-400">{selectedStep.step.description}</p>

            <div className="mt-6 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4">
              {selectedStep.logs.length === 0 ? (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-6 text-center text-slate-400">
                  Keine Logs in diesem Schritt.
                </div>
              ) : (
                <ul className="space-y-3">
                  {selectedStep.logs.map((log, idx) => {
                    const renderedTimestamp = formatTimestamp(log.timestamp);

                    return (
                      <li
                        key={`${selectedStep.step.id}-${idx}`}
                        className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.35em] text-slate-500">
                          {renderedTimestamp && (
                            <span className="font-mono text-slate-400">{renderedTimestamp}</span>
                          )}
                          <span className="rounded-full border border-slate-700/60 bg-slate-900/60 px-2 py-0.5 font-semibold text-slate-300">
                            {log.level}
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-medium text-slate-50">{log.message}</p>

                        {log.data && Object.keys(log.data).length > 0 && (
                          <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-[11px] leading-relaxed text-slate-300">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
