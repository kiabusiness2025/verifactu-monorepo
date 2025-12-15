# Notifications Service

A microservice for managing user notifications in the VeriFactu monorepo.

## Overview

The Notifications service provides a RESTful API for creating, reading, updating, and deleting notifications. It supports filtering by user and status, and includes functionality for marking notifications as read.

## Features

- ✅ Create new notifications
- ✅ Retrieve all notifications
- ✅ Filter notifications by user ID or status
- ✅ Get notification by ID
- ✅ Mark individual notification as read
- ✅ Mark all notifications as read for a user
- ✅ Delete notifications
- ✅ Health check endpoint
- ✅ JSON-based API
- ✅ Structured logging with Pino

## API Endpoints

### Health Check
```
GET /health
```
Returns the health status of the service.

### Get All Notifications
```
GET /notifications
GET /notifications?userId=user-123
GET /notifications?status=unread
```
Returns notifications, optionally filtered by userId and/or status.

### Get Notification by ID
```
GET /notifications/:id
```
Returns a specific notification by its ID.

### Create Notification
```
POST /notifications
Content-Type: application/json

{
  "userId": "user-123",
  "message": "Your invoice has been processed",
  "type": "success"
}
```
Required fields: `userId`, `message`  
Optional fields: `type` (default: "info")

### Mark Notification as Read
```
PATCH /notifications/:id/read
```
Marks a specific notification as read and adds a `readAt` timestamp.

### Mark All Notifications as Read
```
POST /notifications/mark-all-read
Content-Type: application/json

{
  "userId": "user-123"
}
```
Marks all unread notifications for a user as read.

### Delete Notification
```
DELETE /notifications/:id
```

## Notification Types

- `info` - Informational messages
- `success` - Success messages
- `warning` - Warning messages
- `error` - Error messages

## Notification Statuses

- `unread` - Notification has not been read
- `read` - Notification has been read

## Running the Service

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Testing
```bash
npm test
```

## Environment Variables

- `PORT`: Port number (default: 8082)
- `NODE_ENV`: Environment mode (set to 'test' to skip server startup)

## Docker

Build and run the service using Docker:

```bash
docker build -t verifactu-notifications .
docker run -p 8082:8082 verifactu-notifications
```

## Data Storage

Currently uses in-memory storage for demonstration purposes. In production, this should be replaced with a persistent database.

## Dependencies

- Express.js - Web framework
- Pino - Logging library
- Jest - Testing framework
- Supertest - HTTP testing library
