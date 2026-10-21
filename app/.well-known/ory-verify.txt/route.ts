import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse('ory-verify=orynth-414dfadc04da4342ab180800c2422e74\n', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
