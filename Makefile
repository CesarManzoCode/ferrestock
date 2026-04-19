.PHONY: help up down restart \
        rebuild rebuild-backend rebuild-frontend \
        logs logs-backend logs-frontend \
        shell-backend shell-frontend shell-db \
        migrate migrate-create migrate-down \
        create-admin set-superadmin \
        up-prod down-prod restart-prod rebuild-prod deploy

# ── Ayuda ──────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "FerreStock — Comandos disponibles"
	@echo "────────────────────────────────────────────────────"
	@echo "  DESARROLLO:"
	@echo "    make up                   Levantar todo en local"
	@echo "    make down                 Bajar contenedores"
	@echo "    make restart              Reiniciar servicios"
	@echo "    make rebuild              Reconstruir TODO"
	@echo "    make rebuild-backend      Reconstruir solo backend"
	@echo "    make rebuild-frontend     Reconstruir solo frontend"
	@echo ""
	@echo "  LOGS:"
	@echo "    make logs                 Todos los servicios"
	@echo "    make logs-backend         Solo backend"
	@echo "    make logs-frontend        Solo frontend"
	@echo ""
	@echo "  SHELLS:"
	@echo "    make shell-backend        Shell en backend"
	@echo "    make shell-frontend       Shell en frontend"
	@echo "    make shell-db             PostgreSQL shell"
	@echo ""
	@echo "  BASE DE DATOS:"
	@echo "    make migrate                           Aplicar migraciones"
	@echo "    make migrate-create msg='descripcion'  Nueva migración"
	@echo "    make migrate-down                      Revertir última"
	@echo ""
	@echo "  USUARIOS:"
	@echo "    make create-admin         Crear admin de ferretería"
	@echo "    make set-superadmin       Asignar rol superadmin"
	@echo ""
	@echo "  PRODUCCIÓN:"
	@echo "    make deploy               Deploy completo (build + migrate)"
	@echo "    make up-prod              Levantar producción"
	@echo "    make down-prod            Bajar producción"
	@echo "    make rebuild-prod         Reconstruir en producción"
	@echo ""

# ── Desarrollo ─────────────────────────────────────────────────────────────
up:
	@test -f .env || (cp .env.example .env && echo "⚠  Creado .env desde .env.example — edita los valores antes de continuar.")
	docker compose up -d
	@echo ""
	@echo "✓ FerreStock corriendo en http://localhost"

down:
	docker compose down

restart:
	docker compose restart

rebuild:
	docker compose down
	docker compose build --no-cache
	docker compose up -d

rebuild-backend:
	docker compose build --no-cache backend
	docker compose up -d --no-deps backend
	@echo "✓ Backend reconstruido"

rebuild-frontend:
	docker compose build --no-cache frontend
	docker compose up -d --no-deps frontend
	@echo "✓ Frontend reconstruido"

# ── Logs ───────────────────────────────────────────────────────────────────
logs:
	docker compose logs -f --tail=100

logs-backend:
	docker compose logs -f backend --tail=100

logs-frontend:
	docker compose logs -f frontend --tail=100

# ── Shells ─────────────────────────────────────────────────────────────────
shell-backend:
	docker compose exec backend bash

shell-frontend:
	docker compose exec frontend sh

shell-db:
	docker compose exec db psql -U $${POSTGRES_USER:-ferrestock} -d $${POSTGRES_DB:-ferrestock_db}

# ── Migraciones ────────────────────────────────────────────────────────────
migrate:
	docker compose exec backend alembic upgrade head

migrate-create:
	@test -n "$(msg)" || (echo "❌ Uso: make migrate-create msg='descripcion'" && exit 1)
	docker compose exec backend alembic revision --autogenerate -m "$(msg)"

migrate-down:
	docker compose exec backend alembic downgrade -1

# ── Usuarios ───────────────────────────────────────────────────────────────
create-admin:
	docker compose exec backend python scripts/create_admin.py

set-superadmin:
	docker compose exec backend python scripts/set_superadmin.py

# ── Producción ─────────────────────────────────────────────────────────────
# Deploy completo: reconstruye, levanta y migra
deploy:
	@echo "→ Construyendo imágenes..."
	docker compose -f docker-compose.prod.yml build --no-cache
	@echo "→ Levantando servicios..."
	docker compose -f docker-compose.prod.yml up -d
	@echo "→ Aplicando migraciones..."
	docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
	@echo ""
	@echo "✓ FerreStock desplegado en producción"

up-prod:
	docker compose -f docker-compose.prod.yml up -d

down-prod:
	docker compose -f docker-compose.prod.yml down

restart-prod:
	docker compose -f docker-compose.prod.yml restart

rebuild-prod:
	docker compose -f docker-compose.prod.yml build --no-cache
	docker compose -f docker-compose.prod.yml up -d
	docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
	@echo "✓ Rebuild de producción completo"
