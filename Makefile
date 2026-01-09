.PHONY: build up down logs restart clean deploy test

# Build Docker images
build:
	docker-compose build

# Start services
up:
	docker-compose up -d

# Stop services
down:
	docker-compose down

# View logs
logs:
	docker-compose logs -f

# Restart services
restart:
	docker-compose restart

# Clean everything (including volumes)
clean:
	docker-compose down -v
	docker system prune -f

# Deploy to production
deploy:
	./scripts/deploy.sh

# Setup SSL certificates
ssl:
	./scripts/setup-ssl.sh

# Test services
test:
	@echo "Testing API..."
	@curl -f http://localhost:5000/api/public/health || echo "API not responding"
	@echo "\nTesting Socket..."
	@curl -f http://localhost:5001/health || echo "Socket not responding"

# Database backup
backup:
	@mkdir -p backups
	@docker-compose exec -T postgres pg_dump -U postgres qmenus > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup created in backups/"

# Database restore
restore:
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make restore FILE=backups/backup_file.sql"; \
		exit 1; \
	fi
	@docker-compose exec -T postgres psql -U postgres qmenus < $(FILE)
	@echo "Database restored from $(FILE)"

# Show service status
status:
	@docker-compose ps
	@echo "\n--- Service Health ---"
	@curl -s http://localhost/api/public/health | jq . || echo "API health check failed"

# Enter backend container
shell:
	docker-compose exec backend sh

# Enter database
db:
	docker-compose exec postgres psql -U postgres qmenus
