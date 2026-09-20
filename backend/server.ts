import app from './app';
import config from './common/config';
import { notFoundHandler, errorHandler } from './api/middleware/errorHandler';

// For standalone backend runs, catch any remaining unhandled non-API paths with notFoundHandler
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`CivicPulse AI Backend running on port ${config.PORT}`);
});
