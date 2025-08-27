## Creando un enviador de correos

vamos a crear una ruta admin/send pars escribir el código (visualmente atractivo, cuando menos de colores) en un editor de html donde planeo pegar templates que construyo en codepen. Son templates de correo electronico que llevan el branding del proyecto, estos templates se pueden observar en los envios de correo que ya existen e el proyecto. Quiero poder poner una lista de correos de los destinatarios, pero también quiero poder filtar mis usuarios por sus tags y ver la lista de correos actualizarse en un text area, separados por coma y exportables. La interfaz debe ser minimalista, simple, sencilla pero funcional y util. el objetivo es poder enviar en cualquier momento un correo con un template (que también sería util poder seleccionar entre los que ya existen, con un pequeño preview) y poder trackear la data que ya nos proporcina ses (aperturas, rebotes, clics etc)Todo el proyecto debe ser una sola ruta con componentes dinámicos solo si es necesario, que usen fetcher (react-router v7) apuntando a la propia ruta (con funcion action e intents, usando solo post). Es importante que para todo el desarrollo se evite el envio real de correos, nos intereza alcanzar la interfaz usable y el uso del template correctamente, añadiremos el envío en la etapa final.

### Second prompt:

los filtros pueden reconocerse en el loader, para poder crear url pre
configuradas (con filtros y templates) via searchparams. Por ahora no valides
admin, tengo problemas para loguearme en localhost.

## HTML

<h1>FixterGeek.com</h1>
<p style="padding:16px;font-size:24px;font-weight:bold;">
¡Hola geek! 👋🏼
</p>

## Template final

```html
<div
  style="padding:80px 16px;font-family:sans-serif;font-size:18px;max-width:420px;margin:0 auto;"
>
  <img alt="logo" style="width:160px;" src="https://i.imgur.com/mpzZhT9.png" />
  <h2 style="font-size:32px;margin-top:24px;">📺 ¡Ha llegado la hora! 🚀</h2>
  <p>
    <strong>El webinar comenzará pronto:</strong>
  </p>
  <h3 style="color:#83F3D3;font-size:24px;margin:20px 0;">
    Conviértete en un Power User de Claude Code
  </h3>
  <p style="margin:20px 0;"><strong>📅 Hora:</strong> 7pm (CDMX)</p>
  <p>Esta es la agenda para hoy:</p>
  <p style="margin-top:24px;">
    <strong>
      * Te platicaremos cómo Claude Code y la inteligencia artificial aplicada
      al código lo ha cambiado todo para nosotros.
    </strong>
  </p>
  <p style="margin-top:24px;">
    <strong> * Haremos un recorrido por el temario del taller. </strong>
  </p>
  <p style="margin-top:24px;">
    <strong> * Brendi nos dará su testimonio real. </strong>
  </p>
  <p style="margin-top:24px;">
    <strong> * Terminaremos con un pequeño demo usando Claude Code. </strong>
  </p>
  <p style="margin-top:24px;">
    <strong>
      Todo el evento es en vivo, así que puedes hacer preguntas en cualquier
      momento.
      <br />🙋🏻‍♀️🙋🏻‍♂️
    </strong>
  </p>
  <a
    href="https://fixtergeek.com"
    style="border-radius:24px;text-decoration:none;background:#83F3D3;padding:12px 16px;font-size:16px;margin:32px 0;display:block;max-width:180px;text-align:center;cursor:pointer;color:#0E1317;"
  >
    Da clic aquí para llegar puntual 😉
  </a>
  <p style="font-size:14px;color:#666;margin-top:40px;">
    Si tienes alguna pregunta, no dudes en contactarnos.
  </p>
</div>
```
