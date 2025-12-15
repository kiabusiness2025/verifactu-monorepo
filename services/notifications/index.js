import express from "express";
import pino from "pino";

const log = pino();
const app = express();
app.use(express.json());

// In-memory store for notifications (for demonstration purposes)
const notifications = new Map();
let notificationCounter = 1;

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "notifications" });
});

// Get all notifications
app.get("/notifications", (req, res) => {
  try {
    const { userId, status } = req.query;
    let allNotifications = Array.from(notifications.values());
    
    // Filter by userId if provided
    if (userId) {
      allNotifications = allNotifications.filter(n => n.userId === userId);
    }
    
    // Filter by status if provided
    if (status) {
      allNotifications = allNotifications.filter(n => n.status === status);
    }
    
    res.json({ ok: true, data: allNotifications, count: allNotifications.length });
  } catch (error) {
    log.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get notification by ID
app.get("/notifications/:id", (req, res) => {
  try {
    const { id } = req.params;
    const notification = notifications.get(id);
    
    if (!notification) {
      return res.status(404).json({ ok: false, error: "Notification not found" });
    }
    
    res.json({ ok: true, data: notification });
  } catch (error) {
    log.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Create new notification
app.post("/notifications", (req, res) => {
  try {
    const notificationData = req.body;
    
    if (!notificationData || !notificationData.userId || !notificationData.message) {
      return res.status(400).json({ 
        ok: false, 
        error: "Missing required fields: userId and message" 
      });
    }
    
    const id = `NOT-${notificationCounter++}`;
    const notification = {
      id,
      userId: notificationData.userId,
      message: notificationData.message,
      type: notificationData.type || "info",
      status: "unread",
      createdAt: new Date().toISOString()
    };
    
    notifications.set(id, notification);
    log.info({ notificationId: id, userId: notification.userId }, "Notification created");
    
    res.status(201).json({ ok: true, data: notification });
  } catch (error) {
    log.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Mark notification as read
app.patch("/notifications/:id/read", (req, res) => {
  try {
    const { id } = req.params;
    
    if (!notifications.has(id)) {
      return res.status(404).json({ ok: false, error: "Notification not found" });
    }
    
    const notification = notifications.get(id);
    const updatedNotification = {
      ...notification,
      status: "read",
      readAt: new Date().toISOString()
    };
    
    notifications.set(id, updatedNotification);
    log.info({ notificationId: id }, "Notification marked as read");
    
    res.json({ ok: true, data: updatedNotification });
  } catch (error) {
    log.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Delete notification
app.delete("/notifications/:id", (req, res) => {
  try {
    const { id } = req.params;
    
    if (!notifications.has(id)) {
      return res.status(404).json({ ok: false, error: "Notification not found" });
    }
    
    notifications.delete(id);
    log.info({ notificationId: id }, "Notification deleted");
    
    res.json({ ok: true, message: "Notification deleted successfully" });
  } catch (error) {
    log.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Mark all notifications as read for a user
app.post("/notifications/mark-all-read", (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ ok: false, error: "Missing userId" });
    }
    
    let updatedCount = 0;
    for (const [id, notification] of notifications.entries()) {
      if (notification.userId === userId && notification.status === "unread") {
        notifications.set(id, {
          ...notification,
          status: "read",
          readAt: new Date().toISOString()
        });
        updatedCount++;
      }
    }
    
    log.info({ userId, count: updatedCount }, "All notifications marked as read");
    res.json({ ok: true, updatedCount });
  } catch (error) {
    log.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

const PORT = process.env.PORT || 8082;

// Only start the server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => log.info(`Notifications service listening on :${PORT}`));
}

export default app;
