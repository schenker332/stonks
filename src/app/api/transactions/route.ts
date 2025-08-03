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
