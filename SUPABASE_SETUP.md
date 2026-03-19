# Guía de conexión a Supabase - Finanzas Páramo

## Paso 1: Crear o acceder a tu proyecto en Supabase

1. Ve a **[supabase.com](https://supabase.com)** e inicia sesión.
2. Si no tienes proyecto:
   - Clic en **"New Project"**
   - Nombre: `finanzas-paramo` (o el que prefieras)
   - Contraseña de la base de datos: elige una segura y **guárdala**
   - Región: la más cercana a ti
   - Clic en **"Create new project"**
3. Espera unos minutos a que el proyecto termine de crearse.

---

## Paso 2: Obtener las credenciales

1. En el dashboard de tu proyecto, entra a **Project Settings** (icono de engranaje).
2. En el menú lateral, abre **API**.
3. Copia estos dos valores:

| Variable | Dónde encontrarla |
|----------|-------------------|
| **Project URL** | En "Project URL" |
| **anon public** | En "Project API keys" → clave que dice "anon" y "public" |

---

## Paso 3: Configurar el archivo `.env`

1. En la raíz del proyecto, abre o crea el archivo **`.env`**.
2. Pega y completa con tus valores:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxx
```

Sustituye:
- `xxxxxxxxxxxx` en la URL por el ID real de tu proyecto.
- La clave larga por tu **anon public key** completa.

---

## Paso 4: Ejecutar las migraciones (crear tablas)

### Opción A: Desde el SQL Editor de Supabase

1. En Supabase: **SQL Editor** → **New query**.
2. Copia y pega todo el contenido de:
   - `supabase/migrations/20260319140428_create_financial_management_schema.sql`
   - Luego `supabase/migrations/20260319150000_allow_anon_for_development.sql`
3. Ejecuta cada archivo con **Run**.

### Opción B: Con Supabase CLI (si la tienes instalada)

```bash
npx supabase db push
```

---

## Paso 5: Reiniciar la aplicación

Después de cambiar el `.env`:

```bash
npm run dev
```

Recarga la app en el navegador. Si todo está bien, verás el Dashboard conectado a Supabase.

---

## Comprobar la conexión

- Si las tablas existen y el `.env` es correcto, en **Dashboard** deberías ver datos o tablas vacías.
- En Supabase → **Table Editor** puedes insertar filas de prueba en `wallets` o `clientes` para comprobarlo.

---

## Notas de seguridad

- No subas el archivo `.env` a Git (ya está en `.gitignore`).
- La clave `anon` es pública (va en el frontend). La seguridad real viene de las políticas RLS.
- Las migraciones incluyen políticas para `anon` que permiten acceso sin login para desarrollo. En producción es recomendable activar Supabase Auth y ajustar las políticas.
