import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'trustscore.db');
const db = new sqlite3.Database(dbPath);

// Initialize Database
db.serialize(() => {
  // Shops table
  db.run(`CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop TEXT UNIQUE,
    accessToken TEXT,
    plan TEXT DEFAULT 'FREE',
    subscriptionId TEXT,
    installedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Scans table
  db.run(`CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop TEXT,
    score INTEGER,
    data TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(shop) REFERENCES shops(shop)
  )`);
  
  // Session storage table (for Shopify OAuth)
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    content TEXT,
    shop TEXT
  )`);
});

export const getShop = (shopDomain) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM shops WHERE shop = ?', [shopDomain], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const createOrUpdateShop = (shop, accessToken) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO shops (shop, accessToken) VALUES (?, ?)
       ON CONFLICT(shop) DO UPDATE SET accessToken = ?`,
      [shop, accessToken, accessToken],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
};

export const updateShopPlan = (shop, plan, subscriptionId) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE shops SET plan = ?, subscriptionId = ? WHERE shop = ?`,
      [plan, subscriptionId, shop],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

export const saveScan = (shop, score, data) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO scans (shop, score, data) VALUES (?, ?, ?)`,
      [shop, score, JSON.stringify(data)],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
};

export const getScanHistory = (shop) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM scans WHERE shop = ? ORDER BY createdAt DESC`,
      [shop],
      (err, rows) => {
        if (err) reject(err);
        else {
          // Parse JSON data
          const parsedRows = rows.map(row => ({
            ...row,
            data: JSON.parse(row.data)
          }));
          resolve(parsedRows);
        }
      }
    );
  });
};

export const getScanCount = (shop) => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(*) as count FROM scans WHERE shop = ?`,
      [shop],
      (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      }
    );
  });
};

// Session Storage Implementation for Shopify
export const sessionCallback = {
  storeCallback: async (session) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO sessions (id, content, shop) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET content = ?, shop = ?`,
        [session.id, JSON.stringify(session), session.shop, JSON.stringify(session), session.shop],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  },
  loadCallback: async (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT content FROM sessions WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row ? JSON.parse(row.content) : undefined);
      });
    });
  },
  deleteCallback: async (id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM sessions WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  },
};

export default db;
