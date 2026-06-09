const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { initDB } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/boloes',   require('./routes/boloes'));
app.use('/api/matches',  require('./routes/matches'));
app.use('/api/palpites', require('./routes/palpites'));

// Serve React build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/build/index.html')));
}

initDB();
app.listen(PORT, () => console.log(`🚀 Servidor na porta ${PORT}`));
