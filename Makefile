.PHONY: help up down restart rebuild logs shell-backend shell-db \
        migrate migrate-create create-admin build-backend build-frontend \
        up-prod down-prod restart-prod rebuild-prod

# ── Ayuda ──────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "FerreStock — Comandos disponibles"
	@echo "────────────────────────────────────────"
	@echo "  Dev:"
	@echo "    make up              Levantar entorno de desarrollo"
	@echo "    make down            Bajar contenedores"
	@echo "    make restart         Reiniciar contenedores"
	@echo "    make rebuild         Reconstruir imágenes y levantar"
	@echo "    make logs            Ver logs en tiempo real"
	@echo "    make shell-backend   Shell dentro del contenedor backend"
	@echo "    make shell-db        Shell de PostgreSQL"
	@echo ""
	@echo "  Base de datos:"
	@echo "    make migrate         Aplicar migraciones pendientes"
	@echo "    make migrate-create msg='descripcion'  Nueva migración"
	@echo ""
	@echo "  Admin:"
	@echo "    make create-admin    Crear superadmin interactivo"
	@echo ""
	@echo "  Producción:"
	@echo "    make up-prod         Levantar en producción"
	@echo "    make down-prod       Bajar producción"
	@echo "    make rebuild-prod    Reconstruir y desplegar"
	@echo ""

# ── Desarrollo ─────────────────────────────────────────────────────────────────
up:
	@cp -n .env.example .env 2>/dev/null || true
	docker compose up -d
	@echo "✓ FerreStock corriendo en http://localhost:8000/docs"

down:
	docker compose down

restart:
	docker compose restart

rebuild:
	docker compose down
	docker compose build --no-cache
	docker compose up -d

logs:
	docker compose logs -f --tail=100

logs-backend:
	docker compose logs -f backend --tail=100

shell-backend:
	docker compose exec backend bash

shell-db:
	docker compose exec db psql -U $${POSTGRES_USER:-ferrestock} -d $${POSTGRES_DB:-ferrestock_db}

# ── Migraciones ────────────────────────────────────────────────────────────────
migrate:
	docker compose exec backend alembic upgrade head

migrate-create:
	@test -n "$(msg)" || (echo "Uso: make migrate-create msg='descripcion del cambio'" && exit 1)
	docker compose exec backend alembic revision --autogenerate -m "$(msg)"

migrate-down:
	docker compose exec backend alembic downgrade -1

# ── Admin ──────────────────────────────────────────────────────────────────────
create-admin:
	docker compose exec backend python scripts/create_admin.py

# ── Producción ─────────────────────────────────────────────────────────────────
up-prod:
	docker compose -f docker-compose.prod.yml up -d

down-prod:
	docker compose -f docker-compose.prod.yml down

restart-prod:
	docker compose -f docker-compose.prod.yml restart

rebuild-prod:
	docker compose -f docker-compose.prod.yml down
	docker compose -f docker-compose.prod.yml build --no-cache
	docker compose -f docker-compose.prod.yml up -d
	docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
	@echo "✓ Desplegado en producción"
