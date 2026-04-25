import { NextResponse } from 'next/server';
import { clearSession } from '../../../lib/context.js';

export async function POST(request) {
  try {
    const { sessionId } = await request.json();
    if (sessionId) clearSession(sessionId);
    return NextResponse.json({ status: 'cleared', sessionId });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
