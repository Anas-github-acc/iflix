import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { Server } from 'socket.io';
import { createServer } from 'http';

interface Message {
  userName: string;
  message: string;
  timestamp: string;
}

// GET endpoint to fetch initial messages
export async function GET() {
  try {
    const redis = await getRedisClient();
    const messages = await redis.lRange('chat:global:messages', 0, 99);
    const parsedMessages = messages.map((msg) => JSON.parse(msg) as Message).reverse();
    return NextResponse.json(parsedMessages);
  } catch (error) {
    console.error('Chat GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// WebSocket handler
let io: Server | undefined;

if (!io) {
  const httpServer = createServer();
  io = new Server(httpServer, {
    path: '/api/chat',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('message', async (data: { userName: string; message: string }) => {
      try {
        const { userName, message } = data;
        
        // Validate input
        if (!userName || !message || message.length > 500) {
          return;
        }

        const redis = await getRedisClient();
        const sanitizedMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const timestamp = new Date().toISOString();
        
        const msgObj: Message = {
          userName,
          message: sanitizedMessage,
          timestamp
        };

        // Store in Redis
        await redis.lPush('chat:global:messages', JSON.stringify(msgObj));
        await redis.lTrim('chat:global:messages', 0, 99);

        // Broadcast to all clients
        io?.emit('message', msgObj);
      } catch (error) {
        console.error('Message handling error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  httpServer.listen(3001);
}
