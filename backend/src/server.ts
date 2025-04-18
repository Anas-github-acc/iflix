import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import initRedis from './redisClient.ts';
import { initRabbitMQ, SendToQueue } from './rabbitmqClient.ts';
import type { RecommendationRequest, ActionRequest, RecommendationResponse, ActionResponse } from './types.ts';

await initRedis();
await initRabbitMQ();

const app = new Hono()

  
app.get('/', (c) => {
  return c.json({health: 'ok'})
})


app.post('api/v1/action', async (c) => {
  const body: ActionRequest = await c.req.json();
  const reqId = crypto.randomUUID();
  if (!['like', 'view'].includes(body.action) || (body.action === 'like' && (body.rating === undefined || body.rating < 0 || body.rating > 5))) {
    return c.json({ error: 'Invalid action or rating' }, 400);
  }
  
  SendToQueue('user_actions', { reqId, userId: body.userId, action: body.action, movieId: body.movieId, rating: body.rating });
  // channel.sendToQueue('user_actions', Buffer.from(JSON.stringify({ reqId, userId: body.userId, action: body.action, movieId: body.movieId, rating: body.rating })), { persistent: true });
  
  const response: ActionResponse = {
    message: 'Action recorded',
    reqId,
  };
  
  return c.json(response);
});


app.get('api/v1/recommend', async (c) => {
  const body: RecommendationRequest = await c.req.json();
  const reqId = crypto.randomUUID();

  SendToQueue('recommendation_requests', { reqId, userId: body.userId });

  const response: RecommendationResponse = {
    reqId,
    recommendations: ['Movie A', 'Movie B', 'Movie C'],
  };

  return c.json(response);
})


app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
})

export default app

serve({
  fetch: app.fetch,
  port: 8000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
