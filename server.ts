import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// API endpoint for Cesium Ion access token (kept securely on server)
app.get('/api/cesium-token', (req, res) => {
  const token = process.env.CESIUM_ION_TOKEN || process.env.VITE_CESIUM_ION_TOKEN || '';
  res.json({ token });
});

// Serve static frontend files
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
