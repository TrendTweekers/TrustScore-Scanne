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

  db.run(`CREATE TABLE IF NOT EXISTS competitor_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop TEXT,
    competitor_url TEXT,
    score INTEGER,
    result TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(shop) REFERENCES shops(shop)
  )`);

  // Robust migration to ensure columns exist
  const ensureColumns = () => {
    db.all("PRAGMA table_info(shops)", (err, columns) => {
      if (err) {
        console.error("Failed to get table info for shops:", err);
        return;
      }

      const existingColumns = columns.map(c => c.name);
      const migrations = [
        { name: 'revenue_bracket', query: "ALTER TABLE shops ADD COLUMN revenue_bracket TEXT" },
        { name: 'ai_usage_count', query: "ALTER TABLE shops ADD COLUMN ai_usage_count INTEGER DEFAULT 0" },
        { name: 'ai_usage_reset_date', query: "ALTER TABLE shops ADD COLUMN ai_usage_reset_date DATETIME" }
      ];

      migrations.forEach(migration => {
        if (!existingColumns.includes(migration.name)) {
          console.log(`Running migration: ${migration.query}`);
          db.run(migration.query, (err) => {
            if (err) console.error(`Migration failed for ${migration.name}:`, err);
            else console.log(`Migration successful for ${migration.name}`);
          });
        } else {
            // console.log(`Column ${migration.name} already exists.`);
        }
      });
    });
  };
  
  ensureColumns();
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

const saveCompetitorScan = (shop, url, score, result) => {
  return new Promise((resolve, reject) => {
    db.run(`INSERT INTO competitor_scans (shop, competitor_url, score, result) VALUES (?, ?, ?, ?)`, 
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

const getScansForChart = (shop, days = 30) => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT score, timestamp FROM scans WHERE shop = ? AND timestamp >= datetime('now', '-${days} days') ORDER BY timestamp ASC`, [shop], (err, rows) => {
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

const getCompetitorScans = (shop) => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM competitor_scans WHERE shop = ? ORDER BY timestamp DESC`, [shop], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getCompetitorScanCount = (shop) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as count FROM competitor_scans WHERE shop = ?`, [shop], (err, row) => {
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

const updateShopRevenue = (shop, revenue) => {
  return new Promise((resolve, reject) => {
    db.run(`UPDATE shops SET revenue_bracket = ? WHERE shop = ?`, [revenue, shop], function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const incrementAIUsage = (shop) => {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE shops SET ai_usage_count = COALESCE(ai_usage_count, 0) + 1 WHERE shop = ?`, [shop], function(err) {
             if (err) reject(err);
             else resolve(this);
        });
    });
};

const resetAIUsage = (shop) => {
    return new Promise((resolve, reject) => {
        // Set reset date to 30 days from now
        const nextReset = new Date();
        nextReset.setDate(nextReset.getDate() + 30);
        
        db.run(`UPDATE shops SET ai_usage_count = 0, ai_usage_reset_date = ? WHERE shop = ?`, 
            [nextReset.toISOString(), shop], function(err) {
             if (err) reject(err);
             else resolve(this);
        });
    });
};

module.exports = {
  createOrUpdateShop,
  getShop,
  saveScan,
  saveCompetitorScan,
  getScanHistory,
  getScansForChart,
  getScanCount,
  getCompetitorScans,
  getCompetitorScanCount,
  updateShopPlan,
  updateShopRevenue,
  incrementAIUsage,
  resetAIUsage
};
