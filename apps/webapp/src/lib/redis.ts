import { Redis } from "ioredis";

const publisher = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 1,
});

const subscriber = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 1,
});

export { publisher, subscriber };