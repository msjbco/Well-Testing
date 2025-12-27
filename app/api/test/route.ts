// Test route to verify Next.js API routes work
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Next.js API route is working!' });
}

