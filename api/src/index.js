require('dotenv').config();

const app = require('./app');
const { initDb } = require('./db');
const { connectRedis } = require('./db/redis');

const port = Number(process.env.PORT || 4000);

async function start() {
  await initDb();
  await connectRedis();

  app.listen(port, () => {
    console.log(`CodeDrop API listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start CodeDrop API', error);
  process.exit(1);
});
