import http from 'node:http';
import appInstance from './src/app.js';
import { env } from './src/config/env.config.js';
import { redisService } from './src/redis/index.js';

try {
  await redisService.connect();
  await appInstance.initialize();

  const server = http.createServer(appInstance.app);

  server.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}
