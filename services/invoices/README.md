# Invoices Service

A microservice for managing invoices in the VeriFactu monorepo.

## Overview

The Invoices service provides a RESTful API for creating, reading, updating, and deleting invoices. It's designed to work as part of the VeriFactu ecosystem for Spanish invoice verification.

## Features

- ✅ Create new invoices
- ✅ Retrieve all invoices
- ✅ Get invoice by ID
- ✅ Update invoice information
- ✅ Delete invoices
- ✅ Health check endpoint
- ✅ JSON-based API
- ✅ Structured logging with Pino

## API Endpoints

### Health Check
```
GET /health
```
Returns the health status of the service.

### Get All Invoices
```
GET /invoices
```
Returns all invoices in the system.

### Get Invoice by ID
```
GET /invoices/:id
```
Returns a specific invoice by its ID.

### Create Invoice
```
POST /invoices
Content-Type: application/json

{
  "clientName": "Test Client",
  "amount": 100.50,
  "description": "Invoice description"
}
```

### Update Invoice
```
PUT /invoices/:id
Content-Type: application/json

{
  "status": "paid",
  "amount": 150.00
}
```

### Delete Invoice
```
DELETE /invoices/:id
```

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

- `PORT`: Port number (default: 8081)
- `NODE_ENV`: Environment mode (set to 'test' to skip server startup)

## Docker

Build and run the service using Docker:

```bash
docker build -t verifactu-invoices .
docker run -p 8081:8081 verifactu-invoices
```

## Data Storage

Currently uses in-memory storage for demonstration purposes. In production, this should be replaced with a persistent database.

## Dependencies

- Express.js - Web framework
- Pino - Logging library
- Jest - Testing framework
- Supertest - HTTP testing library
