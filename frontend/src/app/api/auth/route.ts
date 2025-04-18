import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { hash, compare } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
// import { cookies } from 'next/headers';

const TOKEN_EXPIRY = 24 * 60 * 60; // 24 hours in seconds

export async function POST(request: Request) {
  const { email, password, username, action } = await request.json();
  const redis = await getRedisClient();

  try {
    if (action === 'register') {
      const hashedPassword = await hash(password, 10);
      await redis.hSet(`user:${email}`, {
        password: hashedPassword,
        username: username,
        createdAt: Date.now()
      });
    } else {
      const userData = await redis.hGetAll(`user:${email}`);
      if (!userData.password) {
        return NextResponse.json({ error: 'User not found' }, { status: 401 });
      }
      const isValid = await compare(password, userData.password);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }
    }

    // Generate access token
    const accessToken = uuidv4();
    
    // Store token in Redis with expiry
    await redis.setEx(`token:${accessToken}`, TOKEN_EXPIRY, email);

    // Get username for login response
    const userData = await redis.hGetAll(`user:${email}`);
    
    // Create response with token cookie and username
    const response = NextResponse.json({ 
      message: 'Authentication successful',
      username: userData.username
    });
    
    response.cookies.set({
      name: 'accessToken',
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: TOKEN_EXPIRY
    });

    return response;
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// Verify token middleware
export async function verifyToken(token: string | undefined): Promise<{ 
  isValid: boolean; 
  email?: string; 
}> {
  if (!token) return { isValid: false };
  
  try {
    const redis = await getRedisClient();
    const email = await redis.get(`token:${token}`);
    
    return {
      isValid: !!email,
      email: email || undefined
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return { isValid: false };
  }
}


