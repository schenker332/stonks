'use client';

type EditableItemType = 'income' | 'expense';

type EditableItem = {
  id: string;
  include: boolean;
  dateISO: string | null;
  dateRaw: string;
  name: string;
  category: string;
  priceInput: string;
  priceRaw: string;
  priceValue: number;
  type: EditableItemType;
  tag: string;
  error?: string;
};

interface ProcessOcrItemsPanelProps {
  items: EditableItem[];
  itemsYear: number;
  onYearChange: (value: string) => void;
  onIncludeToggle: (id: string) => void;
  onItemFieldChange: (id: string, field: 'name' | 'category' | 'tag', value: string) => void;
  onItemPriceChange: (id: string, value: string) => void;
  onItemTypeChange: (id: string, type: EditableItemType) => void;
  onItemDateChange: (id: string, value: string) => void;
  onImport: () => void;
  isImporting: boolean;
  hasImportableItems: boolean;
  isLoadingItems: boolean;
  itemsError: string | null;
  itemsMessage: string | null;
}

export function ProcessOcrItemsPanel({
  items,
  itemsYear,
  onYearChange,
  onIncludeToggle,
  onItemFieldChange,
  onItemPriceChange,
  onItemTypeChange,
  onItemDateChange,
  onImport,
  isImporting,
  hasImportableItems,
  isLoadingItems,
  itemsError,
  itemsMessage,
}: ProcessOcrItemsPanelProps) {
  return (
    <section className="rounded-3xl border border-[#e6dcff] bg-white/85 p-6 shadow-[0_25px_70px_rgba(203,179,255,0.2)]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#2c1f54]">OCR Ergebnisse prüfen</h2>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-end gap-2">
            <label className="flex flex-col text-xs uppercase tracking-[0.35em] text-[#7f6ab7]">
              Jahr
              <input
                type="number"
                value={itemsYear}
                min={2000}
                max={2100}
                onChange={(event) => onYearChange(event.target.value)}
                className="mt-2 w-24 rounded-lg border border-[#d9cfff] bg-white px-3 py-2 text-sm text-[#2c1f54] focus:border-[#c89bf6] focus:outline-none focus:ring-2 focus:ring-[#d3a5f8]/40"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={onImport}
            disabled={!hasImportableItems || isImporting}
            className={`h-10 rounded-full border px-5 text-xs font-semibold uppercase tracking-[0.35em] transition-colors duration-300 ${
              !hasImportableItems || isImporting
                ? 'cursor-not-allowed border-[#d9cfff] bg-white text-[#b4a5dd]'
                : 'border-emerald-300 bg-emerald-100 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-200 hover:text-emerald-800'
            }`}
          >
            💾 In DB übernehmen
          </button>
        </div>
      </div>

      {isLoadingItems && (
        <div className="mb-4 rounded-2xl border border-[#e6dcff] bg-white p-4 text-center text-sm text-[#7f6ab7]">
          OCR-Ergebnisse werden geladen…
        </div>
      )}

      {itemsError && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {itemsError}
        </div>
      )}

      {itemsMessage && !isLoadingItems && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {itemsMessage}
        </div>
      )}

      {!isLoadingItems && items.length === 0 && !itemsError && (
        <div className="rounded-2xl border border-[#e6dcff] bg-white p-8 text-center text-[#7f6ab7]">
          Aktuell liegen keine OCR-Ergebnisse vor. Starte die Pipeline oder lade die Daten neu.
        </div>
      )}

      {!isLoadingItems && items.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-[#e6dcff] shadow-[0_16px_45px_rgba(203,179,255,0.12)]">
          <table className="min-w-full divide-y divide-[#e5dbff] text-left text-sm text-[#3b2a63]">
            <thead>
              <tr className="bg-[#f2eaff] text-xs uppercase tracking-[0.2em] text-[#7f63bb]">
                <th className="px-3 py-3 rounded-tl-2xl"></th>
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Kategorie</th>
                <th className="px-4 py-3">Preis</th>
                <th className="px-4 py-3">Typ</th>
                <th className="px-4 py-3 rounded-tr-2xl">Tag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ece4ff]">
              {items.map((item) => (
                <tr key={item.id} className="align-top transition-colors duration-150 hover:bg-[#f6efff]">
                  <td className="px-3 py-3">
                    <div className="flex justify-center">
                      <input
                        id={`include-${item.id}`}
                        type="checkbox"
                        checked={item.include}
                        onChange={() => onIncludeToggle(item.id)}
                        className="peer sr-only"
                        aria-label="Transaktion für den Import auswählen"
                      />
                      <label
                        htmlFor={`include-${item.id}`}
                        className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-[#d9cfff] bg-white shadow-[0_6px_16px_rgba(203,179,255,0.22)] transition-all duration-200 hover:border-[#c897f6] hover:shadow-[0_10px_20px_rgba(203,179,255,0.28)] peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#d3a5f8]/40 peer-checked:border-[#bfa0f5] peer-checked:bg-[#d3a5f8]"
                      >
                        <span className="pointer-events-none scale-75 transform text-xs font-semibold text-white opacity-0 transition-all duration-200 peer-checked:scale-110 peer-checked:opacity-100">
                          ✓
                        </span>
                      </label>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      value={item.dateISO ?? ''}
                      onChange={(event) => onItemDateChange(item.id, event.target.value)}
                      className="w-40 rounded-lg border border-[#d9cfff] bg-white px-3 py-2 text-sm text-[#2c1f54] focus:border-[#c89bf6] focus:outline-none focus:ring-2 focus:ring-[#d3a5f8]/40"
                    />
                    {item.dateRaw && (
                      <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-[#8e7abf]">
                        Raw: {item.dateRaw}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(event) => onItemFieldChange(item.id, 'name', event.target.value)}
                      className="w-48 rounded-lg border border-[#d9cfff] bg-white px-3 py-2 text-sm text-[#2c1f54] focus:border-[#c89bf6] focus:outline-none focus:ring-2 focus:ring-[#d3a5f8]/40"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.category}
                      onChange={(event) => onItemFieldChange(item.id, 'category', event.target.value)}
                      className="w-44 rounded-lg border border-[#d9cfff] bg-white px-3 py-2 text-sm text-[#2c1f54] focus:border-[#c89bf6] focus:outline-none focus:ring-2 focus:ring-[#d3a5f8]/40"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.priceInput}
                      placeholder={item.priceRaw || '0,00'}
                      onChange={(event) => onItemPriceChange(item.id, event.target.value)}
                      className="w-28 rounded-lg border border-[#d9cfff] bg-white px-3 py-2 text-sm text-[#2c1f54] focus:border-[#c89bf6] focus:outline-none focus:ring-2 focus:ring-[#d3a5f8]/40"
                    />
                    {item.priceRaw && (
                      <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-[#8e7abf]">
                        Raw: {item.priceRaw}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="inline-flex gap-1 rounded-full border border-[#d9cfff] bg-white px-1 py-1">
                      <button
                        type="button"
                        onClick={() => onItemTypeChange(item.id, 'expense')}
                        className={`relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                          item.type === 'expense'
                            ? 'bg-rose-100 text-rose-700 before:absolute before:inset-0 before:rounded-full before:border before:border-rose-200'
                            : 'text-[#7f6ab7] hover:bg-rose-50 hover:text-rose-600'
                        }`}
                      >
                        <span aria-hidden="true">−</span>
                        <span className="sr-only">Ausgabe</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onItemTypeChange(item.id, 'income')}
                        className={`relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                          item.type === 'income'
                            ? 'bg-emerald-100 text-emerald-700 before:absolute before:inset-0 before:rounded-full before:border before:border-emerald-200'
                            : 'text-[#7f6ab7] hover:bg-emerald-50 hover:text-emerald-600'
                        }`}
                      >
                        <span aria-hidden="true">+</span>
                        <span className="sr-only">Einnahme</span>
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.tag}
                      onChange={(event) => onItemFieldChange(item.id, 'tag', event.target.value)}
                      className="w-40 rounded-lg border border-[#d9cfff] bg-white px-3 py-2 text-sm text-[#2c1f54] focus:border-[#c89bf6] focus:outline-none focus:ring-2 focus:ring-[#d3a5f8]/40"
                    />
                    {item.error && (
                      <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-rose-500">
                        Fehler: {item.error}
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
  );
}
