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
    const { date, name, category, price, tag, description, amount, type } = body;

    // Validierung - neue Felder bevorzugen, alte als Fallback
    const finalDate = date;
    const finalName = name || description || '';
    const finalCategory = category || '';
    const finalPrice = price !== undefined ? price : (amount !== undefined ? amount : 0);
    const finalTag = tag || '';
    const finalType = type || 'expense';

    if (!finalDate || !finalName) {
      return new NextResponse('Fehlende oder ungültige Daten (date, name benötigt)', { status: 400 });
    }

    if (finalType !== 'income' && finalType !== 'expense') {
      return new NextResponse('Type muss "income" oder "expense" sein', { status: 400 });
    }

    // Neue Transaktion erstellen mit allen Feldern
    const transaction = await prisma.transaction.create({
      data: {
        date: new Date(finalDate),
        name: finalName,
        category: finalCategory,
        price: parseFloat(finalPrice.toString()),
        tag: finalTag,
        description: description || finalName,
        amount: parseFloat(finalPrice.toString()),
        type: finalType,
      },
    });

    return NextResponse.json(transaction);
  } catch (err) {
    console.error('🔥 Fehler in POST /api/transactions:', err);
    return new NextResponse('Interner Server-Fehler', { status: 500 });
  }
}
