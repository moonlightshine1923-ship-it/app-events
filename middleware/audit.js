import pool from '../config/db.js';

export const auditMiddleware = async (req, res, next) => {
  const originalJson = res.json.bind(res);
  // Only log mutating methods
  if (['POST','PUT','PATCH','DELETE'].includes(req.method)) {
    res.json = async (body) => {
      try {
        const userId = req.user ? req.user.id : null;
        const action = `${req.method} ${req.path}`;
        const table = req.baseUrl ? req.baseUrl.split('/').pop() : req.path.split('/')[1] || 'unknown';
        const recordId = req.params.id ? parseInt(req.params.id) : (body && body.id ? body.id : null);
        await pool.query(
          `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) VALUES (?,?,?,?,?,?,?)`,
          [
            userId,
            action,
            table,
            recordId,
            JSON.stringify({ body: req.body, response: body?.id ? { id: body.id } : {} }),
            req.ip,
            req.headers['user-agent'] || ''
          ]
        );
      } catch (e) {
        console.error('Audit log failed', e.message);
      }
      return originalJson(body);
    };
  }
  next();
};

export const getAuditLogs = async (req, res) => {
  const { event_id, user_id, limit = 100 } = req.query;
  let q = `SELECT a.*, u.username FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id WHERE 1=1`;
  const params = [];
  if (event_id) { /* maybe filter via table events - optional */ }
  if (user_id) { q += ` AND a.user_id=?`; params.push(user_id); }
  q += ` ORDER BY a.created_at DESC LIMIT ?`;
  params.push(parseInt(limit));
  const [rows] = await pool.query(q, params);
  res.json(rows);
};
