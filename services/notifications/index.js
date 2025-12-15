const express = require('express');

function createApp() {
  const app = express();
  app.use(express.json());

  const notifications = new Map();
  let nextId = 1;

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/notifications', (req, res) => {
    const all = Array.from(notifications.values());
    const { userId, status } = req.query;
    const filtered = all.filter((notif) => {
      const matchesUser = userId ? String(notif.userId) === String(userId) : true;
      const matchesStatus = status ? notif.status === status : true;
      return matchesUser && matchesStatus;
    });
    res.json(filtered);
  });

  app.get('/notifications/:id', (req, res) => {
    const notification = notifications.get(Number(req.params.id));
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(notification);
  });

  app.post('/notifications', (req, res) => {
    const { userId, message, metadata = {} } = req.body || {};
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    const id = nextId++;
    const notification = {
      id,
      userId,
      message,
      metadata,
      status: 'unread',
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    notifications.set(id, notification);
    res.status(201).json(notification);
  });

  app.patch('/notifications/:id/read', (req, res) => {
    const id = Number(req.params.id);
    const notification = notifications.get(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = {
      ...notification,
      status: 'read',
      readAt: new Date().toISOString(),
    };
    notifications.set(id, updated);
    res.json(updated);
  });

  app.patch('/notifications/:id/unread', (req, res) => {
    const id = Number(req.params.id);
    const notification = notifications.get(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = {
      ...notification,
      status: 'unread',
      readAt: null,
    };
    notifications.set(id, updated);
    res.json(updated);
  });

  app.delete('/notifications/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!notifications.has(id)) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    notifications.delete(id);
    res.status(204).send();
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT || 4002;
  app.listen(port, () => {
    console.log(`Notifications service listening on port ${port}`);
  });
}

module.exports = { createApp };
