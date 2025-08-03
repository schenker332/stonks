// src/app/api/transactions/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(transactions);
  } catch (err) {
    console.error('🔥 Fehler in GET /api/transactions:', err);
    return new NextResponse('Interner Server-Fehler', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, description, amount, type } = body;

    // Validierung
    if (!date || !description || amount === undefined || !type) {
      return new NextResponse('Fehlende oder ungültige Daten', { status: 400 });
    }

    if (type !== 'income' && type !== 'expense') {
      return new NextResponse('Type muss "income" oder "expense" sein', { status: 400 });
    }

    // Neue Transaktion erstellen
    const transaction = await prisma.transaction.create({
      data: {
        date: new Date(date),
        description,
        amount: parseFloat(amount),
        type,
      },
    });

    return NextResponse.json(transaction);
  } catch (err) {
    console.error('🔥 Fehler in POST /api/transactions:', err);
    return new NextResponse('Interner Server-Fehler', { status: 500 });
  }
}
