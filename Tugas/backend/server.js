const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());

// Data generator with unique IDs
let userIdCounter = 1;
const createUser = () => ({
  id: userIdCounter++,
  name: `User ${userIdCounter}`,
  age: Math.floor(Math.random() * 50) + 18,
  email: `user${userIdCounter}@example.com`
});

// Paginated API
app.get('/api/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
    
    const users = Array.from({ length: limit }, () => createUser());
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Streaming API
app.get('/api/users-stream', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  let count = 0;
  const streamInterval = setInterval(() => {
    if (count >= 50) {
      clearInterval(streamInterval);
      res.end();
      return;
    }
    
    try {
      const user = createUser();
      res.write(JSON.stringify(user) + '\n');
      count++;
    } catch (error) {
      clearInterval(streamInterval);
      res.status(500).end();
    }
  }, 100);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});