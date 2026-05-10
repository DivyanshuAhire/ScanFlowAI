# ScanFlow AI - Dental Field Operations Platform

ScanFlow AI is a production-grade SaaS workflow automation platform designed for dental labs and field scan teams.

## 🚀 Quick Start

### Prerequisites
- Node.js (v20+)
- Docker & Docker Compose
- PostgreSQL (or use the provided Docker setup)

### Setup
1. **Clone the repository**
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Update variables in .env
   ```
4. **Database Setup**
   ```bash
   npm run db:generate
   npm run db:push
   ```
5. **Start Development**
   ```bash
   npm run dev
   ```

## 🏗️ Architecture

- **Monorepo**: Turborepo for fast builds and shared code.
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Framer Motion.
- **Backend**: Express.js with TypeScript, JWT Auth, Socket.io.
- **Database**: Prisma ORM with PostgreSQL.
- **Assignment Engine**: Multi-factor scoring logic (Proximity, Workload, Specialization).

## 🛠️ Tech Stack

- **Framework**: Next.js, Express
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Prisma, PostgreSQL
- **Real-time**: Socket.io
- **Auth**: JWT with Refresh Tokens & RBAC
- **Infrastructure**: Docker, GitHub Actions

## 🔐 Security Features

- **JWT Refresh Token Rotation**: Secure `httpOnly` cookies.
- **RBAC**: Middleware-based access control.
- **Audit Logging**: Comprehensive tracking of system changes.
- **Data Integrity**: Transactional database operations.

## 🗺️ Roadmap

- [x] MVP Core (Clinics, Employees, Appointments)
- [x] Smart Assignment Engine
- [x] Dashboard & Routes UI
- [x] Docker & CI/CD Setup
- [ ] AI Scheduling Optimization (Beta)
- [ ] Advanced Route Analytics
- [ ] Speech-to-text Field Notes
