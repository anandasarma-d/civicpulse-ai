import app from './app';

const PORT = Number(process.env.BACKEND_PORT || process.env.PORT || 8080);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CivicPulse AI Backend running on port ${PORT}`);
});
