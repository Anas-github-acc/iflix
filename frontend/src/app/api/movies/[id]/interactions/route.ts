import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { action, userName, rating, text } = await request.json();
  const movieId = (await params).id;
  const redis = await getRedisClient();
  const timestamp = Date.now();

  let scoreIncrement = 0;

  switch (action) {
    case 'like':
      await redis.sAdd(`movie:${movieId}:likes:${userName}`, '1');
      scoreIncrement = 3;
      break;
    case 'rate':
      await redis.set(`movie:${movieId}:ratings:${userName}`, rating.toString());
      scoreIncrement = rating%6;
      break;
    case 'comment':
      const commentId = `${timestamp}-${userName}`;
      await redis.hSet(`movie:${movieId}:comments`, commentId, JSON.stringify({
        user: userName,
        text,
        timestamp,
        movieId
      }));
      scoreIncrement = 2;
      break;
  }

  // const cur = await redis.zScore('movie:recommendations', `${movieId}:${userName}`) || 0;
  await redis.zIncrBy('movie:recommendations', scoreIncrement, `${movieId}:${userName}`);

  return NextResponse.json({ success: true });
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const movieId = params.id;
  const url = new URL(request.url);
  const userName = url.searchParams.get('user');
  const redis = await getRedisClient();

  // Get all comments
  const comments = await redis.hGetAll(`movie:${movieId}:comments`);
  const parsedComments = Object.values(comments).map(c => JSON.parse(c));

  if (!userName) {
    return NextResponse.json({
      userRating: 0,
      userLiked: false,
      comments: parsedComments
    });
  }

  // Get user-specific interactions
  const [userLiked, userRating] = await Promise.all([
    redis.sIsMember(`movie:${movieId}:likes:${userName}`, '1'),
    redis.get(`movie:${movieId}:ratings:${userName}`)
  ]);

  return NextResponse.json({
    userLiked,
    userRating: userRating ? parseInt(userRating) : 0,
    comments: parsedComments
  });
}


