require('dotenv').config();

const app  = require('./app');
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`MOTS backend listening on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`CORS allowed origin: ${process.env.FRONTEND_ORIGIN}`);
});
