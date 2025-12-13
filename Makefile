# Makefile for Docker operations
.PHONY: help build up down restart logs ps exec shell migrate seed clean

help: ## عرض جميع الأوامر المتاحة
	@echo "أوامر Docker المتاحة:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## بناء Docker images
	docker-compose build

up: ## تشغيل جميع الخدمات
	docker-compose up -d

down: ## إيقاف جميع الخدمات
	docker-compose down

restart: ## إعادة تشغيل جميع الخدمات
	docker-compose restart

logs: ## عرض السجلات
	docker-compose logs -f backend

ps: ## عرض حالة الخدمات
	docker-compose ps

exec: ## تنفيذ أمر في backend container (استخدم: make exec CMD="npm run db:deploy")
	docker-compose exec backend $(CMD)

shell: ## فتح shell في backend container
	docker-compose exec backend sh

migrate: ## تشغيل migrations
	docker-compose exec backend npm run db:deploy

seed: ## تشغيل seed
	docker-compose exec backend npm run db:seed

init-db: ## تهيئة قاعدة البيانات (migrations + seeding)
	docker-compose exec backend npm run db:init

clean: ## حذف جميع containers والvolumes
	docker-compose down -v
	docker system prune -f

rebuild: ## إعادة بناء وتشغيل
	docker-compose up -d --build

status: ## عرض حالة PM2 داخل container
	docker-compose exec backend pm2 status

pm2-logs: ## عرض سجلات PM2
	docker-compose exec backend pm2 logs

