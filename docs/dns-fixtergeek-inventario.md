# DNS fixtergeek.com — inventario y migración a Route53 (2026-10-08)

## Estado
- DNS actual: Google Cloud DNS vía Squarespace (`ns-cloud-a{1..4}.googledomains.com`), SOA serial 16.
- **DNSSEC ACTIVO**: DS en `.com` = `59557 8 2 4B70B040…6E7FBC2A` (TTL 86400). Hay que **apagar DNSSEC en Squarespace y esperar ≥24 h** antes de cambiar NS; si no, el dominio deja de resolver (Route53 no firma esta zona).
- Route53: cuenta `476114113638` (perfil `easybits`, la misma de mailmask), zona `Z00268442IYWK8GLHNAGN`, creada con `CallerReference mailmask-fixtergeek.com` (igual que `ensureHostedZone` de mailmask → mailmask la adopta sola en `GET /api/domains/:id/dns`).
- NS nuevos: `ns-1577.awsdns-05.co.uk`, `ns-373.awsdns-46.com`, `ns-1455.awsdns-53.org`, `ns-812.awsdns-37.net`.

## Registros (todos replicados con TTL 300, verificados con `route53 test-dns-answer` 16/16)
| Nombre | Tipo | Valor | TTL viejo | Qué es |
|---|---|---|---|---|
| fixtergeek.com | A | 198.185.159.144, 198.185.159.145, 198.49.23.144, 198.49.23.145 | 14400 | Squarespace: redirección 301 a www |
| www | A / AAAA | 66.241.125.189 / 2a09:8280:1::55:1e4e:0 | 14400 | Fly `fixter2025` |
| animaciones | A / AAAA | 66.241.125.189 / 2a09:8280:1::55:1e4e:0 | 14400 | Fly `fixter2025` |
| admin | CNAME | fixteradmin.netlify.app. | 14400 | Netlify |
| ui | CNAME | panel-5ad52.web.app. | 14400 | Firebase Hosting |
| aio | CNAME | m2515pe.aio-landing.fly.dev. | 14400 | Fly `aio-landing` |
| daniel | CNAME | 530dx69.daniel-flows.fly.dev. | 14400 | Fly `daniel-flows` |
| _dmarc | TXT | "v=DMARC1; p=none;" | 1800 | DMARC |
| mail | MX | 10 feedback-smtp.us-east-2.amazonses.com. | 1800 | SES MAIL FROM |
| mail | TXT | "v=spf1 include:amazonses.com ~all" | 1800 | SPF del MAIL FROM |
| jidv4jw25wo5fp6wba5zo55lhaaameza._domainkey | CNAME | …dkim.amazonses.com. | 1800 | DKIM SES us-east-2 |
| g6vdjizx2nu42n72mfbngnccgnq2ue2u._domainkey | CNAME | …dkim.amazonses.com. | 1800 | DKIM SES us-east-2 |
| xnhe32xxw4dqggryg3kbgglidcf6if6r._domainkey | CNAME | …dkim.amazonses.com. | 1800 | DKIM SES us-east-2 |
| _domainconnect | CNAME | _domainconnect.domains.squarespace.com. | 14400 | Squarespace (inofensivo) |

No existen: MX/TXT/CAA/AAAA en el apex, google-site-verification, `_acme-challenge` (Fly usa TLS-ALPN).

## Cómo se obtuvo
- AXFR rechazado. Sin AXFR sólo se pregunta por nombre: ~140 nombres comunes × 7 tipos.
- Subdominios de Certificate Transparency (certspotter; crt.sh daba 502): admin, aio, animaciones, daniel, ui, www.
- `fly certs list -a fixter2025`: www, animaciones. Tokens DKIM de `aws sesv2 get-email-identity` (us-east-2).
- **Ojo**: el puerto 53 de esta red está interceptado (respuestas sin `aa`, TTL que baja aunque se pregunte al autoritativo). El inventario se hizo por DoH (dns.google) y la verificación con `aws route53 test-dns-answer`.

## Lo que dig no puede ver
- Cualquier subdominio con nombre raro que no esté en CT ni en la lista (p. ej. TXT de verificación sueltos). Revisar el panel de Squarespace antes del cambio.
- La redirección apex→www es "domain forwarding" de Squarespace: puede dejar de funcionar al salir de sus NS. Plan B: certificado de Fly para `fixtergeek.com` y apex A/AAAA a 66.241.125.189 / 2a09:8280:1::55:1e4e:0.

## Pasos para bliss
1. Squarespace → DNSSEC off. Esperar 24 h (TTL del DS).
2. Cambiar NS a los 4 de arriba.
3. Comprobar: `dig @a.gtld-servers.net fixtergeek.com NS +norec` y la web/correo.
