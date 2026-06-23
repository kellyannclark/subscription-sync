# SubscriptionSync

SubscriptionSync is a Shopify application built with Remix, Prisma, PostgreSQL, and Neon that helps subscription-based businesses manage recurring shipments, customer preferences, and fulfillment workflows.

The application allows merchants to:

* Create and manage subscription tiers
* Track subscribers and subscription status
* Collect customer product preferences
* Manage shipment schedules
* Process daily fulfillment queues
* Automate recurring subscription workflows
* View shipment history and upcoming shipments

---

# Tech Stack

### Frontend

* Remix
* React
* TypeScript
* Shopify Polaris
* Shopify App Bridge

### Backend

* Node.js
* Remix Loaders & Actions
* Prisma ORM

### Database

* PostgreSQL
* Neon Serverless Database

### Deployment

* Vercel
* Shopify App Platform

---

# Features

## Subscription Tier Management

Create and manage subscription tiers that define:

* Tier names
* Descriptions
* Assigned products
* Active/Inactive status

Examples:

* Pirate Tier
* Explorer Tier
* Premium Tier

---

## Subscriber Management

Track subscriber information including:

* Subscription Start Date
* Next Ship Date
* Next Selection Deadline
* Auto-Selection Date
* Subscription Status
* Shipment History
* Preference Submission History

---

## Preference Collection

Subscribers can submit product preferences before each shipment cycle.

Preference forms capture:

* Product selections
* Size preferences
* Style preferences
* Additional notes

---

## Daily Fulfillment Queue

SubscriptionSync uses a daily fulfillment model rather than a monthly batch process.

Each subscriber maintains their own schedule based on their subscription start date.

This allows:

* Daily order generation
* Rolling shipment schedules
* Individual subscriber timelines
* Flexible subscription start dates

---

## Shipment Tracking

Track:

* Upcoming shipments
* Completed shipments
* Shipment dates
* Shipment status
* Fulfillment history

---

## Settings Management

Configure application-wide settings including:

* Selection Deadline Offset
* Auto-Selection Offset
* Order Creation Offset
* Reminder Days Before Deadline
* Sender Email
* Auto Order Tags

---

# Database Architecture

SubscriptionSync uses Prisma with PostgreSQL hosted on Neon.

Current database models include:

* Session
* Tier
* Subscriber
* Shipment
* PreferenceSubmission
* Settings

---

# Why Neon?

Neon provides a modern serverless PostgreSQL platform that works exceptionally well with Prisma and Vercel.

Benefits include:

* PostgreSQL compatibility
* Automatic scaling
* Branching for development
* Connection pooling
* Serverless architecture
* Generous free tier

For development and early production deployments, SubscriptionSync is expected to remain comfortably within Neon's free plan limits.

As the application grows, additional database resources can be added without requiring major architectural changes.

---

# Local Development

## Install Dependencies

```bash
npm install
```

## Generate Prisma Client

```bash
npx prisma generate
```

## Run Database Migrations

```bash
npx prisma migrate dev
```

## Start Development Server

```bash
npm run dev
```

---

# Prisma Commands

Generate Prisma Client:

```bash
npx prisma generate
```

Create Migration:

```bash
npx prisma migrate dev --name migration_name
```

Reset Database:

```bash
npx prisma migrate reset
```

Open Prisma Studio:

```bash
npx prisma studio
```

---

# Environment Variables

Example:

```env
DATABASE_URL=
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_APP_URL=
SCOPES=
```

---

# Deployment

## Production Stack

* Shopify App
* Vercel Hosting
* Neon PostgreSQL
* Prisma ORM

Because SubscriptionSync uses standard PostgreSQL, the database can be migrated to another PostgreSQL provider in the future if scaling requirements change.

---

# Current Development Status

### Completed

* Tier Management
* Subscriber List
* Subscriber Detail View
* Shipment Tracking
* Preference Submission Tracking
* Settings Management
* Daily Queue Foundation
* Prisma Database Models
* Neon PostgreSQL Integration

### In Progress

* Shopify Subscriber Import
* Automated Order Creation
* Automated Shipment Processing
* Customer Preference Forms
* Fulfillment Automation

---

# Future Roadmap

* Shopify Customer Sync
* Shopify Order Creation
* Email Notifications
* Automated Reminder Emails
* Customer Portal
* Shipment Analytics
* Inventory Integration
* Subscription Pause & Skip Functionality
* Advanced Reporting

---

# License

Private Internal Project

SubscriptionSync © 2026
