// src/components/StatCard.tsx
type Props = {
  dataKey: string;  // Welcher Datenschlüssel (totalBalance, totalIncome, etc.)
  values: Record<string, number>;  // Das ganze Datenobjekt
  labels: Record<string, string>;
};

export function StatCard({ dataKey, values, labels }: Props) {

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className={`${'text-gray-500'} uppercase text-sm mb-2`}>
        {labels[dataKey]}
      </h2>
      <p className="text-2xl font-semibold">
          €{values[dataKey].toLocaleString('de-DE', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}
