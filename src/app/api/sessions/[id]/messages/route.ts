import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { content, type } = await request.json();
    const { id } = await params;
    
    const message = await prisma.chatMessage.create({
      data: {
        content,
        type: type.toUpperCase(),
        sessionId: id
      }
    });
    
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}