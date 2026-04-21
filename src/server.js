import http from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

const server = http.createServer(app);
connectDB().then(() => {
  server.listen(env.PORT, () => console.log(`Server running on ${env.PORT}`));
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
