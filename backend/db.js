const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'trustscore.db');
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS shops (
    shop TEXT PRIMARY KEY,
    accessToken TEXT,
    plan TEXT DEFAULT 'FREE',
    isActive BOOLEAN DEFAULT 1
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop TEXT,
    url TEXT,
    score INTEGER,
    result TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(shop) REFERENCES shops(shop)
  )`);
});

const createOrUpdateShop = (shop, accessToken) => {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO shops (shop, accessToken, isActive) 
                   VALUES (?, ?, 1) 
                   ON CONFLICT(shop) DO UPDATE SET accessToken = ?, isActive = 1`;
    db.run(query, [shop, accessToken, accessToken], function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const getShop = (shop) => {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM shops WHERE shop = ?`, [shop], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const saveScan = (shop, url, score, result) => {
  return new Promise((resolve, reject) => {
    db.run(`INSERT INTO scans (shop, url, score, result) VALUES (?, ?, ?, ?)`, 
      [shop, url, score, JSON.stringify(result)], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
};

const getScanHistory = (shop) => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM scans WHERE shop = ? ORDER BY timestamp DESC LIMIT 10`, [shop], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getScanCount = (shop) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as count FROM scans WHERE shop = ?`, [shop], (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.count : 0);
        });
    });
};

const updateShopPlan = (shop, plan) => {
  return new Promise((resolve, reject) => {
    db.run(`UPDATE shops SET plan = ? WHERE shop = ?`, [plan, shop], function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

module.exports = {
  createOrUpdateShop,
  getShop,
  saveScan,
  getScanHistory,
  getScanCount,
  updateShopPlan
};
