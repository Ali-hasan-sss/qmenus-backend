import Redis from 'ioredis';

export const createRedis = (url?: string) => {
  if (!url) return null;
  const client = new Redis(url, { lazyConnect: true });
  client.on('error', (err) => console.error('[Redis] error:', err));
  return client;
};
