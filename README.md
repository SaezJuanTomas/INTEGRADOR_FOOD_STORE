# INTEGRADOR FOOD STORE

Aplicación full-stack para la gestión de productos, categorías e ingredientes en una tienda de alimentos. Combina un backend REST API con FastAPI y un frontend moderno en React + TypeScript.

# INTEGRADORES:

Tomás Sáez, Gabriel Kogan, Lucas Norton, Lorenzo Espetxe, Mateo De Martino 
Gonzalo Sevilla

## 🎯 Descripción del Proyecto

INTEGRADOR FOOD STORE es un sistema completo de gestión de catálogo de productos que permite:
- Crear, leer, actualizar y eliminar productos
- Gestionar categorías de productos
- Administrar ingredientes
- Asociar productos con categorías e ingredientes
- Autenticación básica de usuarios
- Interfaz web intuitiva para gestionar el catálogo

## 🛠️ Tecnologías Utilizadas

### Backend
- **FastAPI** - Framework web moderno y rápido
- **SQLAlchemy** - ORM para manejo de base de datos
- **PostgreSQL** - Base de datos relacional
- **Uvicorn** - Servidor ASGI
- **Python 3.10+**

### Frontend
- **React 18** - Librería de UI
- **TypeScript** - Tipado estático
- **Vite** - Bundler rápido
- **React Router** - Navegación
- **React Query** - Gestión de estado y caché de datos
- **Node.js / npm** - Gestor de dependencias

### Infraestructura
- **Docker & Docker Compose** - Containerización
- **PowerShell** - Scripts de automatización

## 📋 Requisitos Previos

- Python 3.10 o superior
- Node.js 16+ y npm
- Docker y Docker Compose
- Entorno virtual Python configurado

## 🚀 Instalación y Setup

### 1. Clonar y configurar Backend

```bash
# Navegar al directorio del proyecto
cd INTEGRADOR_FOOD_STORE

# Crear entorno virtual (si no existe)
python -m venv .venv

# Activar entorno virtual (Windows)
.\.venv\Scripts\Activate.ps1

# Instalar dependencias Python
pip install -r requirements.txt
```

### 2. Configurar Frontend

```bash
# Navegar al directorio frontend
cd frontend

# Instalar dependencias (primera vez)
npm install

# Volver al directorio raíz
cd ..
```

### 3. Levantar la Base de Datos

```bash
# Desde el directorio raíz, iniciar PostgreSQL con Docker
docker compose up -d
```

## 💻 Ejecución de la Aplicación

### Opción A: Levantar Backend y Frontend por separado

**Terminal 1 - Backend:**
```bash
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```
El API estará disponible en: `http://localhost:8000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
La aplicación web estará disponible en: `http://localhost:5500`

### Opción B: Usar comandos rápidos
Ver el archivo `comandos.txt` para comandos listos para copiar y ejecutar.

## 📁 Estructura del Proyecto

```
INTEGRADOR_FOOD_STORE/
├── app/
│   ├── core/                 # Configuración y base de datos
│   │   ├── base.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── repository.py     # Pattern Repository genérico
│   │   └── unit_of_work.py   # Pattern Unit of Work
│   ├── models/               # Modelos ORM SQLAlchemy
│   │   ├── categoria.py
│   │   ├── ingrediente.py
│   │   ├── producto.py
│   │   ├── producto_categoria.py
│   │   └── producto_ingrediente.py
│   └── modules/              # Módulos de negocio (MVC)
│       ├── auth/             # Autenticación
│       ├── categorias/       # Gestión de categorías
│       ├── ingredientes/     # Gestión de ingredientes
│       ├── productos/        # Gestión de productos
│       └── catalogo/         # Catálogo
├── frontend/                 # Aplicación React
│   ├── src/
│   │   ├── components/       # Componentes reutilizables
│   │   ├── pages/            # Páginas principales
│   │   ├── services/         # Conexión con API
│   │   ├── context/          # Context API para estado global
│   │   ├── models/           # Tipos TypeScript
│   │   └── App.tsx
│   └── package.json
├── scripts/
│   └── demo/                 # Scripts de demostración
├── main.py                   # Punto de entrada del backend
├── docker-compose.yml        # Configuración Docker
└── README.md                 # Este archivo
```

## 📡 API Endpoints

### Categorías
- `GET /categorias` - Listar todas las categorías
- `POST /categorias` - Crear nueva categoría
- `GET /categorias/{id}` - Obtener categoría específica
- `PUT /categorias/{id}` - Actualizar categoría
- `DELETE /categorias/{id}` - Eliminar categoría

### Productos
- `GET /productos` - Listar todos los productos
- `POST /productos` - Crear nuevo producto
- `GET /productos/{id}` - Obtener producto específico
- `PUT /productos/{id}` - Actualizar producto
- `DELETE /productos/{id}` - Eliminar producto

### Ingredientes
- `GET /ingredientes` - Listar todos los ingredientes
- `POST /ingredientes` - Crear nuevo ingrediente
- `GET /ingredientes/{id}` - Obtener ingrediente específico
- `PUT /ingredientes/{id}` - Actualizar ingrediente
- `DELETE /ingredientes/{id}` - Eliminar ingrediente

### Autenticación
- `POST /auth/login` - Iniciar sesión

La documentación interactiva completa está disponible en: `http://localhost:8000/docs`

## 🧪 Testing y Demo

### Ver estado de la base de datos
```bash
.\scripts\demo\show_db_state.ps1
```

### Ejecutar demo de creación de datos
```bash
.\scripts\demo\run_demo_requests.ps1
```

## 🏗️ Patrones Utilizados

- **Repository Pattern** - Abstracción del acceso a datos
- **Unit of Work Pattern** - Gestión de transacciones
- **MVC Architecture** - Separación de responsabilidades en el backend
- **Context API** - Gestión de estado global en frontend

## 📝 Notas Importantes

- El frontend se conecta al backend en `http://localhost:8000`
- La base de datos se resetea al hacer `docker compose down -v`
- Para desarrollo, usar `--reload` en uvicorn (ya incluido en los comandos)
- Las dependencias de npm deben instalarse solo la primera vez o cuando cambien

## 👨‍💻 Desarrollo

El proyecto está configurado para desarrollo local con:
- Hot reload en el backend (uvicorn --reload)
- Hot module replacement en el frontend (Vite)
- CORS habilitado para localhost:5500 y 5501
- Base de datos en contenedor Docker separado

## 📝 Licencia

Proyecto Final - Programación 4

