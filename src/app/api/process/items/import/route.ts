import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type ImportItem = {
  id?: string;
  name?: string;
  category?: string;
  tag?: string;
  type?: 'income' | 'expense';
  price?: number;
  date?: string;
  description?: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items: ImportItem[] = Array.isArray(body?.items) ? body.items : [];

    if (!items.length) {
      return NextResponse.json({ imported: 0, message: 'Keine Items ausgewählt.' }, { status: 400 });
    }

    const data = items
      .map((item) => {
        const name = (item.name ?? '').trim();
        if (!name) return null;

        const type = item.type === 'income' ? 'income' : 'expense';
        const priceValue = Number(item.price);
        if (!Number.isFinite(priceValue) || priceValue <= 0) return null;

        const dateValue = item.date ? new Date(item.date) : null;
        if (!dateValue || Number.isNaN(dateValue.getTime())) return null;

        return {
          date: dateValue,
          name,
          category: (item.category ?? '').trim(),
          price: priceValue,
          tag: (item.tag ?? '').trim(),
          description: (item.description ?? name).trim(),
          amount: priceValue,
          type,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    if (!data.length) {
      return NextResponse.json({ imported: 0, message: 'Keine validen Items gefunden.' }, { status: 400 });
    }

    await prisma.transaction.createMany({
      data,
    });

    return NextResponse.json({ imported: data.length });
  } catch (error) {
    console.error('Failed to import OCR items', error);
    return NextResponse.json({ imported: 0, error: 'Import fehlgeschlagen.' }, { status: 500 });
  }
}

