import amqp, { type Channel } from 'amqplib';

let channel: Channel;

export async function initRabbitMQ() {
  const host = process.env.RABBITMQ_HOST || 'rabbitmq';
  const uri = `amqp://guest:guest@${host}:5672`;
  try {
    console.log(`Attempting to connect to RabbitMQ at ${uri}...`);
    const conn = await amqp.connect(uri);
    console.log('RabbitMQ connection established successfully');

    // Verify connection
    console.log('Connection details:', {
      host: conn.connection.serverProperties.host,
      port: conn.connection.serverProperties.port,
      product: conn.connection.serverProperties.product,
    });

    channel = await conn.createChannel();
    console.log('RabbitMQ channel created successfully');

    // Assert queues with individual logging
    await channel.assertQueue('recommendation_requests', { durable: true });
    await channel.assertQueue('user_actions', { durable: true });
    await channel.assertQueue('embeddings', { durable: true });
    await channel.assertQueue('training_data', { durable: true });

    console.log(`Connected to RabbitMQ at ${host}:5672, all queues initialized`);

    // Handle connection errors
    conn.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
    });

    // Handle connection close
    conn.on('close', () => {
      console.log('RabbitMQ connection closed');
    });

    // Handle channel errors
    channel.on('error', (err) => {
      console.error('RabbitMQ channel error:', err);
    });

    return channel;
  } catch (error) {
    console.error(`Failed to connect to RabbitMQ at ${host}:5672:`, error);
    throw error;
  }
}

export async function SendToQueue(queue: string, message: any) {
  if (!channel) {
    console.log('No channel exists, initializing RabbitMQ...');
    await initRabbitMQ();
  }
  try {
    console.log(`Sending message to queue ${queue}:`, message);
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
    console.log(`Message sent to queue ${queue}`);
  } catch (error) {
    console.error(`Failed to send message to queue ${queue}:`, error);
    throw error;
  }
}

// Optional: Test connection on module load (remove in production)
initRabbitMQ().catch((err) => {
  console.error('Initial RabbitMQ connection test failed:', err);
});