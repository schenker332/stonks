// src/app/api/transactions/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }    // <-- params ist jetzt ein Promise
) {
  // 1. params auflösen
  const { id } = await context.params;

  // 2. in eine Zahl wandeln
  const txId = Number(id);

  // 3. löschen
  await prisma.transaction.delete({ where: { id: txId } });

  return NextResponse.json({ success: true });
}
