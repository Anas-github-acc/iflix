import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '../route';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  const { isValid, email } = await verifyToken(token);

  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ email });
}
