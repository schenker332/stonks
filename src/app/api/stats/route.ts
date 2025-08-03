// src/app/api/stats/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    data: {
      totalBalance: 12500.75,
      totalIncome: 4500.00,
      totalExpense: 3200.25,
    },
    labels: {
      totalBalance: 'Gesamtvermögen',
      totalIncome: 'Einnahmen',
      totalExpense: 'Ausgaben',
    }
  });
}
