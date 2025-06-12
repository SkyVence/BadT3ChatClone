import { Redis } from "ioredis";

const redisConfig = {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxLoadFactor: 5,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
    connectTimeout: 10000,
    commandTimeout: 5000,
};

const publisher = new Redis(process.env.REDIS_URL!, redisConfig);

const subscriber = new Redis(process.env.REDIS_URL!, redisConfig);

// Handle connection events for debugging
publisher.on('connect', () => {
    console.log('Redis publisher connected');
});

publisher.on('error', (error) => {
    console.error('Redis publisher error:', error);
});

subscriber.on('connect', () => {
    console.log('Redis subscriber connected');
});

subscriber.on('error', (error) => {
    console.error('Redis subscriber error:', error);
});

export { publisher, subscriber };