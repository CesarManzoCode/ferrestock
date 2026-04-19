# FerreStock

Sistema de gestión de inventario y cotizaciones para ferreterías. SaaS multi-tenant desplegado en Docker.

**Stack:** FastAPI · React/Vite · PostgreSQL · Docker · Nginx

---

## Desarrollo local

### Requisitos
- Docker y Docker Compose
- Make

### Levantar el proyecto

```bash
git clone <repo>
cd ferrestock

# Crear y editar variables de entorno
cp .env.example .env
# Editar .env: cambia SECRET_KEY y POSTGRES_PASSWORD

make up        # Levanta todos los servicios
make migrate   # Aplica el esquema de base de datos
```

Listo. La app corre en **http://localhost**

### Crear el primer usuario

```bash
# Crear admin de una ferretería
make create-admin

# Asignar rol superadmin (panel de administración)
make set-superadmin
```

### Comandos útiles

```bash
make logs-backend     # Ver logs del backend en tiempo real
make logs-frontend    # Ver logs del frontend
make shell-backend    # Shell dentro del contenedor backend
make shell-db         # Consola de PostgreSQL

make rebuild-backend  # Reconstruir solo el backend (cambios en requirements.txt)
make rebuild-frontend # Reconstruir solo el frontend (cambios en package.json)
make rebuild          # Reconstruir todo
```

### URLs en desarrollo

| Servicio       | URL                          |
|---------------|------------------------------|
| App            | http://localhost             |
| API (docs)     | http://localhost:8000/docs   |
| Panel admin    | http://localhost/superadmin  |
| Health check   | http://localhost/health      |

---

## Deploy en producción (DigitalOcean)

### 1. Preparar el servidor

```bash
# En una VPS Ubuntu 22.04/24.04 limpia
apt update && apt upgrade -y
apt install -y docker.io docker-compose-v2 make certbot nginx-common
systemctl enable --now docker
```

### 2. Subir el proyecto

```bash
# Opción A: clonar desde git
git clone <repo> /opt/ferrestock
cd /opt/ferrestock

# Opción B: subir por SCP desde tu máquina
scp -r ./ferrestock root@<IP_VPS>:/opt/ferrestock
```

### 3. Configurar variables de entorno

```bash
cd /opt/ferrestock
cp .env.example .env
nano .env
```

Valores que **debes cambiar** en producción:

```env
POSTGRES_PASSWORD=una_contrasena_muy_segura_aqui
SECRET_KEY=genera_con_python3_-c_"import_secrets;print(secrets.token_hex(32))"
DEBUG=false
VITE_API_URL=/api/v1
```

### 4. Apuntar el dominio al servidor

En tu registrador de dominios (Namecheap, GoDaddy, etc.), crea dos registros A:

```
Tipo  Nombre  Valor
A     @       <IP_de_tu_VPS>
A     www     <IP_de_tu_VPS>
```

Espera 5-30 minutos a que los DNS propaguen antes de continuar.

### 5. Obtener certificado SSL

```bash
# Crear directorio para validación
mkdir -p /var/www/certbot

# Obtener certificado (reemplaza con tu dominio real)
certbot certonly --webroot \
  -w /var/www/certbot \
  -d ferrestock.store \
  -d www.ferrestock.store \
  --email tu@correo.com \
  --agree-tos \
  --no-eff-email
```

> **Nota:** Certbot instala un cron automático que renueva el certificado cada 90 días.

### 6. Ajustar dominio en nginx

Editar `nginx/nginx.conf` y cambiar las dos líneas con el dominio:

```nginx
server_name ferrestock.store www.ferrestock.store;
ssl_certificate     /etc/letsencrypt/live/ferrestock.store/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/ferrestock.store/privkey.pem;
```

### 7. Desplegar

```bash
make deploy
# Esto construye imágenes, levanta servicios y aplica migraciones

# Crear primer usuario admin
docker compose -f docker-compose.prod.yml exec backend python scripts/create_admin.py

# Asignar superadmin
docker compose -f docker-compose.prod.yml exec backend python scripts/set_superadmin.py
```

### Comandos de producción

```bash
make up-prod          # Levantar sin reconstruir
make down-prod        # Bajar
make restart-prod     # Reiniciar
make rebuild-prod     # Reconstruir + migrar

# Logs en producción
docker compose -f docker-compose.prod.yml logs -f backend
```

---

## Cambiar de dominio (de ferrestock.store a ferrestock.mx)

1. Apuntar el nuevo dominio al mismo servidor
2. Obtener nuevo certificado con certbot
3. Cambiar `ferrestock.store` por `ferrestock.mx` en `nginx/nginx.conf`
4. `make restart-prod`

---

## Estructura del proyecto

```
ferrestock/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Endpoints (auth, productos, cotizaciones, superadmin)
│   │   ├── core/            # Config, DB, seguridad, dependencias
│   │   ├── models/          # Modelos SQLModel (tenant, usuario, producto, cotizacion)
│   │   ├── schemas/         # Schemas Pydantic de entrada/salida
│   │   └── services/        # Lógica de negocio (búsqueda, importación, PDF)
│   ├── alembic/             # Migraciones de base de datos
│   ├── scripts/             # Utilidades CLI (create_admin, set_superadmin)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/      # UI reutilizable + layout
│       ├── pages/           # Inventario, cotizaciones, importar, superadmin
│       ├── services/        # Clientes API (api.js, saApi.js)
│       └── store/           # Estado global Zustand (authStore, saStore)
├── nginx/
│   ├── nginx.conf           # Producción (SSL)
│   └── nginx.dev.conf       # Desarrollo (sin SSL)
├── docker-compose.yml       # Desarrollo
├── docker-compose.prod.yml  # Producción
├── Makefile
└── .env.example
```

---

## Seguridad

- Autenticación JWT con access token (24h) y refresh token (30 días)
- Multi-tenant: cada ferretería solo ve sus propios datos (`tenant_id` en todas las queries)
- Panel superadmin completamente separado (rol `superadmin`, tokens independientes)
- HTTPS obligatorio en producción con TLS 1.2/1.3
- Headers de seguridad: HSTS, X-Frame-Options, X-Content-Type-Options
- Usuarios no-root dentro de los contenedores Docker
- Variables sensibles nunca en el código, siempre en `.env`

---

## Variables de entorno

| Variable            | Descripción                          | Ejemplo                    |
|--------------------|--------------------------------------|----------------------------|
| `POSTGRES_USER`    | Usuario de PostgreSQL                | `ferrestock`               |
| `POSTGRES_PASSWORD`| Contraseña de PostgreSQL             | `contraseña_segura`        |
| `POSTGRES_DB`      | Nombre de la base de datos           | `ferrestock_db`            |
| `SECRET_KEY`       | Clave para firmar JWT (32+ chars)    | `abc123...` (hex aleatorio)|
| `DEBUG`            | Activa docs de API y logs verbose    | `true` / `false`           |
| `TRIAL_DAYS`       | Días de prueba gratuita              | `14`                       |
| `VITE_API_URL`     | URL del API para el frontend         | `/api/v1`                  |

