# QMenus Backend

Backend services for QMenus application running with PM2 (without Docker).

## Services

- **API Service** - REST API on port 5000
- **Socket Service** - WebSocket/Socket.IO service on port 5001
- **Jobs Service** - Background jobs processor on port 5002

## Prerequisites

- Node.js 20 or higher
- PostgreSQL database
- Redis (optional, for caching)
- PM2 (installed globally)
- Nginx (for reverse proxy and SSL)

## Installation

1. Clone the repository and navigate to backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
cd shared && npm install && cd ..
cd api-service && npm install && cd ..
cd socket-service && npm install && cd ..
cd jobs-service && npm install && cd ..
```

3. Generate Prisma Client:

```bash
cd shared
npx prisma@5.22.0 generate --schema ./prisma/schema.prisma
cd ..
```

4. Create `.env` file (copy from `.env.example` if exists) and configure:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/qmenus
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
API_PORT=5000
SOCKET_PORT=5001
JOBS_PORT=5002
```

5. Run database migrations:

```bash
cd shared
npx prisma@5.22.0 migrate deploy --schema ./prisma/schema.prisma
cd ..
```

6. Seed database (if needed):

```bash
cd api-service
node scripts/check-and-seed.js
cd ..
```

## Building Services

Build all services:

```bash
npm run build:all
```

Or build individually:

```bash
npm run build:api
npm run build:socket
npm run build:jobs
```

## Running Services

### Development Mode

Run all services in development mode (with auto-reload):

```bash
npm run dev
```

Or run individually:

```bash
npm run dev:api
npm run dev:socket
npm run dev:jobs
```

### Production Mode with PM2

Build and start all services:

```bash
npm run build:all
pm2 start pm2.config.js
```

Or use the deployment script:

```bash
./scripts/deploy.sh
```

### PM2 Commands

```bash
# Start services
pm2 start pm2.config.js

# Stop services
pm2 stop pm2.config.js

# Restart services
pm2 restart pm2.config.js

# Delete services
pm2 delete pm2.config.js

# View logs
pm2 logs

# View status
pm2 status

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

## Nginx Configuration

1. Copy nginx configuration to `/etc/nginx/sites-available/`:

```bash
sudo cp nginx/nginx.conf /etc/nginx/sites-available/qmenus-backend
```

2. Create symbolic link:

```bash
sudo ln -s /etc/nginx/sites-available/qmenus-backend /etc/nginx/sites-enabled/
```

3. Test nginx configuration:

```bash
sudo nginx -t
```

4. Reload nginx:

```bash
sudo systemctl reload nginx
```

## SSL Setup with Let's Encrypt

1. Install certbot:

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
```

2. Stop nginx temporarily:

```bash
sudo systemctl stop nginx
```

3. Use the init script (if available):

```bash
sudo ./nginx/init-letsencrypt-server.sh
```

Or manually:

```bash
sudo certbot certonly --standalone -d api.qmenussy.com -d socket.qmenussy.com
```

4. Update nginx configuration to use certificates and restart nginx:

```bash
sudo systemctl start nginx
```

5. Setup auto-renewal (usually handled by certbot automatically):

```bash
sudo certbot renew --dry-run
```

## Deployment

### Manual Deployment

1. Pull latest changes:

```bash
git pull origin main
```

2. Run deployment script:

```bash
./scripts/deploy.sh
```

### Automated Deployment (GitHub Actions)

The repository includes a GitHub Actions workflow that automatically deploys when changes are pushed to `main` branch.

Required GitHub Secrets:

- `SERVER_HOST` - Server IP address or domain
- `SERVER_USER` - SSH username
- `SERVER_PASSWORD` - SSH password
- `SERVER_PATH` - Path to backend directory on server (e.g., `/opt/qmenus/qmenus-backend`)

## Directory Structure

```
backend/
├── api-service/          # REST API service
│   ├── src/             # Source code
│   ├── dist/            # Compiled JavaScript
│   └── logs/            # Application logs
├── socket-service/       # WebSocket service
│   ├── src/             # Source code
│   ├── dist/            # Compiled JavaScript
│   └── logs/            # Application logs
├── jobs-service/         # Background jobs service
│   ├── src/             # Source code
│   ├── dist/            # Compiled JavaScript
│   └── logs/            # Application logs
├── shared/              # Shared code and utilities
│   ├── prisma/          # Prisma schema and migrations
│   └── config/          # Shared configuration
├── nginx/               # Nginx configuration files
├── scripts/             # Deployment and utility scripts
├── pm2.config.js        # PM2 configuration
└── package.json         # Root package.json
```

## Health Checks

- API Service: `http://localhost:5000/health`
- Socket Service: `http://localhost:5001/health`

## Troubleshooting

### Services not starting

1. Check if ports are already in use:

```bash
sudo netstat -tulpn | grep :5000
sudo netstat -tulpn | grep :5001
sudo netstat -tulpn | grep :5002
```

2. Check PM2 logs:

```bash
pm2 logs
```

3. Check individual service logs:

```bash
tail -f api-service/logs/api-error.log
tail -f socket-service/logs/socket-error.log
tail -f jobs-service/logs/jobs-error.log
```

### Database connection issues

1. Verify database is running:

```bash
sudo systemctl status postgresql
```

2. Check DATABASE_URL in `.env` file

3. Test connection:

```bash
cd shared
npx prisma@5.22.0 db push --schema ./prisma/schema.prisma
```

### Prisma Client not generated

```bash
cd shared
npx prisma@5.22.0 generate --schema ./prisma/schema.prisma
```

### Nginx not proxying correctly

1. Check nginx error logs:

```bash
sudo tail -f /var/log/nginx/error.log
```

2. Verify services are running:

```bash
pm2 status
curl http://localhost:5000/health
curl http://localhost:5001/health
```

3. Test nginx configuration:

```bash
sudo nginx -t
```

## Environment Variables

See `.env.example` (if available) for all required environment variables.

Essential variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string (optional)
- `JWT_SECRET` - Secret key for JWT tokens
- `API_PORT` - Port for API service (default: 5000)
- `SOCKET_PORT` - Port for Socket service (default: 5001)
- `JOBS_PORT` - Port for Jobs service (default: 5002)
- `NODE_ENV` - Environment (development/production)

## License

Private
