# Conectar tu dominio propio a Netlify

Netlify gestiona el certificado SSL automáticamente. Solo necesitas configurar el DNS correctamente.

---

## Paso 1: Añadir el dominio en Netlify

1. Entra a [app.netlify.com](https://app.netlify.com) y selecciona tu sitio.
2. Ve a **Domain management** (o **Domain settings**).
3. Clic en **Add custom domain**.
4. Escribe tu dominio (ej: `finanzapp.com` o `www.finanzapp.com`).
5. Clic en **Verify**.

---

## Paso 2: Elegir cómo configurar el DNS

Tienes dos opciones:

### Opción A: Usar Netlify DNS (recomendado, más sencillo)

Netlify se encarga de todo el DNS.

1. En la pantalla del dominio, Netlify te mostrará los **nameservers** que debes configurar.
2. Ejemplo:
   ```
   dns1.p01.nsone.net
   dns2.p01.nsone.net
   dns3.p01.nsone.net
   dns4.p01.nsone.net
   ```
3. Ve al sitio donde compraste el dominio (GoDaddy, Namecheap, Google Domains, etc.).
4. Busca **DNS**, **Nameservers** o **Delegación de dominios**.
5. Cambia los nameservers por defecto a los que te da Netlify.
6. Espera entre 5 minutos y 48 horas (a veces es casi inmediato).
7. En Netlify, clic en **Verify DNS configuration** cuando esté listo.

### Opción B: Usar el DNS de tu proveedor (sin cambiar nameservers)

Configuras tú los registros DNS en tu proveedor de dominio.

1. En Netlify, ve a **Domain settings** → tu dominio → **Set up Netlify DNS** o **Configure external DNS**.
2. Netlify te mostrará qué registros crear. Ejemplo para dominio raíz (`midominio.com`):

   | Tipo | Nombre   | Valor                          |
   |------|----------|--------------------------------|
   | A    | @        | 75.2.60.5                      |
   | CNAME| www      | tu-sitio.netlify.app           |

   *(Los valores exactos los verás en el panel de Netlify.)*

3. En tu proveedor de dominio, entra a la sección de DNS/Registros.
4. Añade el registro **A** apuntando a la IP de Netlify.
5. Añade el registro **CNAME** para `www` apuntando a `tu-sitio.netlify.app`.
6. Guarda los cambios.
7. Espera a que se propaguen (5 min - 48 h).

---

## Paso 3: HTTPS automático

1. Con el DNS correcto, Netlify activa **Let's Encrypt SSL** solo.
2. En **Domain settings** → **HTTPS** puedes ver el estado.
3. Cuando diga **Certificate provisioned**, tu sitio usará `https://`.

---

## Paso 4: Dominio raíz y www

- Si quieres `www.midominio.com`: Netlify suele redirigir desde el dominio raíz.
- Si quieres `midominio.com` sin www: configura el registro A como arriba.
- Puedes tener ambos: Netlify permite añadir el dominio raíz y `www` y hace la redirección.

---

## Resumen rápido

| Paso | Acción |
|------|--------|
| 1 | Netlify → Add custom domain → Escribe tu dominio |
| 2 | Opción A: Cambiar nameservers en tu proveedor a los de Netlify |
| 2 | Opción B: Añadir registros A y CNAME en el DNS de tu proveedor |
| 3 | Esperar propagación (5 min - 48 h) |
| 4 | Verificar en Netlify → HTTPS se activa solo |

---

## Enlaces útiles

- [Documentación de Netlify: Custom domains](https://docs.netlify.com/domains-https/custom-domains/)
- [Netlify DNS](https://docs.netlify.com/domains-https/netlify-dns/)
