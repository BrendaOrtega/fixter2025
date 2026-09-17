---
title: "RFC 9727: la URL fija donde tu agente pregunta qué APIs tienes"
slug: rfc-9727-api-catalog
mainTag: agentes
tags: [agentes, ai, node, tutorial]
authorName: Héctorbliss
contentFormat: markdown
---

Hay una carpeta en cada dominio que los navegadores, los certificados y ahora los agentes revisan antes que nada: `/.well-known/`. Ahí vive `security.txt`, ahí Let's Encrypt deja sus retos, ahí el protocolo A2A publica el `agent-card.json`. Desde junio de 2025 hay un vecino nuevo: **`/.well-known/api-catalog`**, definido en el [RFC 9727](https://www.rfc-editor.org/rfc/rfc9727.html).

La idea cabe en una oración: un cliente que nunca ha visto tu empresa hace un `GET` a esa ruta y recibe la lista de tus APIs, con links a la documentación, la versión y las políticas de uso. Sin buscar en Google, sin portal de desarrolladores, sin un humano en medio.

![Un robot llega a un edificio y lee el letrero /.well-known/api-catalog en la entrada](https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/Vcfug7Gex4bV)

## Quién lo escribió y por qué importa

El autor es Kevin Smith, de Vodafone. Una operadora con decenas de APIs repartidas en varios dominios (red, pagos, IoT, identidad) tiene exactamente el problema que el RFC describe: cada equipo publica lo suyo donde puede y quien llega de fuera tiene que adivinar. El documento salió como **Standards Track**, que es la categoría fuerte del IETF, no un simple informativo.

Y aunque el texto habla de "clientes", el lector que más lo va a agradecer es un agente. Un modelo con acceso a `fetch` puede hoy resolver "¿esta empresa tiene API de facturación?" con una sola petición a una ruta que ya conoce de memoria, en vez de raspar HTML.

## Qué devuelve exactamente

El formato obligatorio es **Linkset** (`application/linkset+json`, [RFC 9264](https://www.rfc-editor.org/rfc/rfc9264.html)). Es JSON, pero pensado como una colección de links con relaciones, no como un objeto arbitrario. El ejemplo mínimo del RFC:

```json
{
  "linkset": [
    {
      "anchor": "https://www.example.com/.well-known/api-catalog",
      "item": [
        { "href": "https://developer.example.com/apis/foo_api" },
        { "href": "https://developer.example.com/apis/bar_api" }
      ]
    }
  ]
}
```

`anchor` es quién habla (el catálogo mismo) y cada `item` es una API. El RFC recomienda colgar metadatos en cada entrada: el `service-doc` con la documentación, el `service-desc` con el OpenAPI, el `status` con la página de salud, la versión, las políticas de uso. Todo son relaciones de link ya registradas en IANA, así que un cliente no necesita un parser especial por proveedor.

![Un cajón de fichero con las tarjetas del linkset y a un lado la petición GET con su respuesta](https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/8SVgPVFPGN36)

Se puede servir además en otros formatos (APIs.json, HAL, Schema.org WebAPI) por negociación de contenido con `Accept`, pero Linkset tiene que estar. El perfil que lo identifica es la propia URL del RFC: `https://www.rfc-editor.org/info/rfc9727`.

## La misma palabra en tres lugares

El RFC registra también la relación de link `api-catalog`, y eso es lo que lo hace descubrible desde cualquier punto de entrada:

1. **En un header HTTP.** Cualquier respuesta de tu dominio, incluida la portada, puede traer `Link: </.well-known/api-catalog>; rel="api-catalog"`. El RFC exige además que un `HEAD` a la ruta del catálogo responda con ese header, así que un cliente lo confirma sin descargar nada.
2. **En HTML.** `<link rel="api-catalog" href="...">` en el `<head>` de la landing.
3. **De un catálogo a otro.** Un catálogo grande enlaza subcatálogos por equipo o por producto con esa misma relación, y el cliente los recorre como un árbol.

![Tres puertas: header HTTP, HTML y catálogo a catálogo, todas llevan al mismo documento](https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/vkJynzI8SJzv)

## Varios dominios, un solo catálogo

Aquí el RFC deja ver la experiencia de Vodafone. Si tus APIs viven en `shop.example`, `pay.example` y `iot.example`, cada dominio publica su `/.well-known/api-catalog`, pero uno se declara canónico y los demás **redirigen** hacia él con un 3xx. Un solo archivo que mantener y ninguna copia desactualizada esperando a que alguien la encuentre.

![Tres dominios redirigen con 3xx al catálogo canónico en developer.example](https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/nfkdtO5TedeF)

## Seguridad: el catálogo también es superficie

La sección de seguridad es corta y sensata:

- **HTTPS**, y de preferencia solo HTTPS. Un catálogo servido en claro se puede reescribir en tránsito y mandar a los clientes a APIs falsas.
- **Auditar lo que se lista.** Es muy fácil que una API interna termine en un archivo público porque alguien automatizó el generado. El RFC pide revisar el catálogo con la misma seriedad que el resto de la superficie expuesta.
- **Sin APIs zombis.** Si una API se retiró, sale del catálogo. Un link a un servicio abandonado invita a que alguien lo explote.
- **Rate limiting** en la ruta, porque será la primera que toque cualquier bot.

## Cómo se ve en tu servidor

En React Router v7 basta con una ruta de recurso. Así quedaría el de fixtergeek.com:

```ts
// app/routes/api-catalog.ts
// Catálogo público de APIs, RFC 9727. Solo se listan las públicas.
export function loader() {
  const body = {
    linkset: [
      {
        anchor: "https://www.fixtergeek.com/.well-known/api-catalog",
        item: [
          {
            href: "https://www.fixtergeek.com/api/blog",
            "service-doc": [{ href: "https://www.fixtergeek.com/docs/blog" }],
          },
        ],
      },
    ],
  };
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
```

Y en `routes.ts`, `route("/.well-known/api-catalog", "routes/api-catalog.ts")`. Un solo archivo, cero dependencias.

## Quién lo publica hoy

Kin Lane, el API Evangelist, hizo la medición en mayo de 2026: lanzó 518 peticiones a 74 proveedores de APIs y contó quién sirve un Linkset real en esa ruta.

| Resultado | Proveedores |
|---|---|
| Catálogo válido según el RFC | 4 |
| 404 limpio | 2 |
| 200 OK, pero devolviendo la portada en HTML | 68 |

Los cuatro son Cloudflare (1 API listada), Zuplo (1), Memesio (2) y Merge.dev (10). Su conclusión: "es como vender una casa preciosa sin número en el buzón", y la implementación es un JSON estático con el header correcto. Probé también antes de escribir esto: `fixtergeek.com` está en el grupo de los 68, y el portal de desarrolladores de Vodafone, la casa del autor del RFC, responde 403.

Hay un atajo si tu documentación vive en Fern: desde 2026 sus sitios exponen el catálogo solos. Para todos los demás, publicarlo cuesta una tarde.

Nosotros ya lo hicimos en dos productos: [ghosty.studio/.well-known/api-catalog](https://www.ghosty.studio/.well-known/api-catalog) y [easybits.cloud/.well-known/api-catalog](https://www.easybits.cloud/.well-known/api-catalog). Los dos responden `application/linkset+json` con el perfil del RFC, y cada entrada trae su `service-desc` apuntando al OpenAPI y su `service-doc` a la documentación. Un agente que llegue a cualquiera de los dos dominios ya sabe qué puede llamar antes de leer una sola página.

En el canal de YouTube de FixterGeek ya hay varias sesiones donde un agente descubre y llama APIs desde una caja de EasyBits; este catálogo es la pieza que le falta a la mayoría de los sitios para que ese flujo empiece solo.

Abrazo. Blissmo. 🤓
