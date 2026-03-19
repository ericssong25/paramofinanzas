# Configuración de autenticación - Finanzas Páramo

## Crear el usuario administrador en Supabase

1. Entra a tu proyecto en **[supabase.com](https://supabase.com)**.
2. Ve a **Authentication** → **Users**.
3. Haz clic en **Add user** → **Create new user**.
4. Completa:
   - **Email:** `paramocreativolg@gmail.com`
   - **Password:** `Paramito2011.`
5. Activa **Auto Confirm User** (o confirma el usuario después si Supabase lo requiere).
6. Haz clic en **Create user**.

---

## Uso en la aplicación

- Sin sesión, se mostrará la pantalla de login.
- Tras iniciar sesión, se accede al dashboard y al resto de la app.
- El botón **Cerrar sesión** está en la parte inferior del menú lateral.
- No hay registro público: los usuarios se crean solo desde el panel de Supabase.
