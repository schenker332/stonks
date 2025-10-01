// src/app/api/transactions/bulk/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const txs: {
      date: string;
      description: string;
      amount: number;
      type: 'income' | 'expense';
    }[] = body.transactions;

    if (!Array.isArray(txs) || txs.length === 0) {
      return new NextResponse('Keine Daten zum Importieren', { status: 400 });
    }

    // Optional: hier könntest du Validierungen/Filter laufen lassen
    await prisma.transaction.createMany({
      data: txs.map((t) => ({
        date: new Date(t.date),
        description: t.description,
        amount: t.amount,
        type: t.type,
      })),
      skipDuplicates: true, // falls du nach ID o.ä. doppelte vermeiden willst
    });

    return NextResponse.json({ imported: txs.length });
  } catch (err) {
    console.error('🔥 Fehler in POST /api/transactions/bulk:', err);
    return new NextResponse('Interner Server-Fehler', { status: 500 });
  }
}
