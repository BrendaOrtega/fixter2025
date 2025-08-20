# Configuración de Google OAuth - URLs de redirección

Para que funcione tanto en desarrollo como producción, necesitas agregar ambas URLs en Google Cloud Console:

## Pasos:

1. **Ve a Google Cloud Console**: https://console.cloud.google.com/
2. **Selecciona tu proyecto**
3. **Ve a "APIs & Services" → "Credentials"**
4. **Edita tu OAuth 2.0 Client ID**
5. **En "Authorized redirect URIs" agrega:**

```
http://localhost:3000/login?auth=google
https://www.fixtergeek.com/login?auth=google
```

## URLs actuales configuradas:

- **Desarrollo:** `http://localhost:3000/login?auth=google`
- **Producción:** `https://www.fixtergeek.com/login?auth=google`

## Verificación:

Después de agregar las URLs, prueba:
- En desarrollo: `npm run dev` → http://localhost:3000/login
- En producción: https://www.fixtergeek.com/login

## Client ID actual:
`590084716663-g42lg2ri98auua3oo6n412v9s6rlper4.apps.googleusercontent.com`

## Nota importante:
Google OAuth requiere que TODAS las redirect URIs estén pre-autorizadas en el console. Sin esto, obtendrás el error "redirect_uri_mismatch".