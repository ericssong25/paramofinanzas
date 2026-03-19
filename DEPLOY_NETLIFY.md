# Publicar Finanzas Páramo en Netlify (vía GitHub)

## Requisitos previos

- Cuenta en [GitHub](https://github.com)
- Cuenta en [Netlify](https://netlify.com)
- Proyecto funcionando en local

---

## Paso 1: Subir el proyecto a GitHub

### 1.1 Inicializar Git (si aún no está inicializado)

En la terminal, dentro de la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Initial commit - Finanzas Páramo"
```

### 1.2 Crear el repositorio en GitHub

1. Entra a [github.com/new](https://github.com/new)
2. Nombre sugerido: `finanzas-paramo`
3. Elige **Private** (recomendado para finanzas)
4. **No** marques "Add README" ni .gitignore (ya los tienes)
5. Clic en **Create repository**

### 1.3 Conectar y subir

```bash
git remote add origin https://github.com/TU_USUARIO/finanzas-paramo.git
git branch -M main
git push -u origin main
```

*(Reemplaza `TU_USUARIO` por tu usuario de GitHub)*

---

## Paso 2: Configurar Netlify

### 2.1 Importar desde GitHub

1. Entra a [app.netlify.com](https://app.netlify.com)
2. Clic en **Add new site** → **Import an existing project**
3. **Connect to Git provider** → **GitHub**
4. Autoriza Netlify si te lo pide
5. Elige el repositorio `finanzas-paramo`

### 2.2 Configuración del build

Netlify debería detectar la configuración de `netlify.toml`. Comprueba que aparezca:

| Campo | Valor |
|-------|-------|
| **Build command** | `npm run build` |
| **Publish directory** | `dist` |

### 2.3 Variables de entorno (importante)

Antes de desplegar, añade las variables de Supabase:

1. En la configuración del sitio: **Site configuration** → **Environment variables**
2. **Add a variable** → **Add a single variable**
3. Añade estas dos:

| Variable | Valor | Scopes |
|----------|-------|--------|
| `VITE_SUPABASE_URL` | `https://sbdndoqxxzctafvprbbh.supabase.co` | All |
| `VITE_SUPABASE_ANON_KEY` | *(tu anon key de Supabase)* | All |

> Las variables `VITE_` se incluyen en el build. Obtén la anon key en Supabase → Project Settings → API.

### 2.4 Desplegar

1. Clic en **Deploy site**
2. Espera a que termine el build (unos minutos)
3. Al finalizar, verás la URL del sitio (ej: `https://random-name.netlify.app`)

---

## Paso 3: Después del primer despliegue

### 3.1 Nombre personalizado (opcional)

- **Site configuration** → **Domain management** → **Options** → **Edit site name**
- Ejemplo: `finanzas-paramo.netlify.app`

### 3.2 Dominio propio (opcional)

- **Domain management** → **Add custom domain**
- Sigue los pasos para configurar tu dominio

---

## Actualizaciones futuras

Cada vez que hagas `git push` a `main`, Netlify desplegará automáticamente una nueva versión.

```bash
git add .
git commit -m "Descripción del cambio"
git push
```

---

## Comprobar que todo funciona

1. Entra a la URL de Netlify
2. Debería aparecer la pantalla de login
3. Inicia sesión con el usuario admin
4. Revisa que el Dashboard cargue datos desde Supabase
