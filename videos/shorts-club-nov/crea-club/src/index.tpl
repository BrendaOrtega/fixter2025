<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      /* Short «crea tu club» (11-nov-2026). Piel FixterGeek en caricatura plana: contorno grueso,
         rellenos sólidos, sombra dura 8px 8px 0; sin gradientes, blur, glow ni grano.
         Circular: abre con el escritorio revuelto (teléfono, recibo, post-it, carpeta) y cierra con el
         mismo escritorio limpio y una sola laptop. Cortinillas: rebanadas sesgadas con glifo, círculo
         REC que tapa y se encoge, columnas verticales con «</>», empujón dentro de la pantalla. */
      :root { --bg:#0e1317; --mint:#85ddcb; --green:#8dcf6e; --ink:#f2f5f4; --grey:#7c8a8e; --steel:#26313a; }
      * { margin:0; padding:0; box-sizing:border-box; }
      html, body { width:1080px; height:1920px; overflow:hidden; background:var(--bg); font-family:"Inter",sans-serif; color:var(--ink); }
      #root { position:relative; width:1080px; height:1920px; overflow:hidden; background:var(--bg); }
      .abs { position:absolute; }
      .mono { font-family:"Space Mono",monospace; }
      #bgwrap { position:absolute; left:0; top:0; width:1080px; height:2300px; }
      #stage { position:absolute; left:0; top:0; width:1080px; height:1920px; }

      /* escritorio: la misma tabla del principio al fin */
      #desk { position:absolute; left:-20px; top:1150px; width:1120px; height:44px; background:var(--steel); border-top:10px solid var(--mint); }
      #deskLeg1, #deskLeg2 { position:absolute; top:1194px; width:34px; height:150px; background:var(--steel); }
      #deskLeg1 { left:120px; } #deskLeg2 { left:860px; }

      .card { background:var(--ink); color:var(--bg); border:8px solid var(--bg); box-shadow:8px 8px 0 var(--mint); }
      .chip { display:inline-block; background:var(--mint); color:var(--bg); font-weight:900; border:6px solid var(--bg); box-shadow:8px 8px 0 var(--green); }

      /* ── escena 1: escritorio revuelto ── */
      #chip1 { left:90px; top:280px; font-size:46px; padding:14px 26px; }
      #phone { left:80px; top:420px; width:300px; height:570px; border-radius:46px; padding:18px 14px; }
      #phone .scr { width:100%; height:100%; background:#e6ece9; border-radius:24px; overflow:hidden; position:relative; }
      #phone .hdr { background:var(--green); height:74px; font-weight:900; font-size:28px; padding:20px 18px; color:var(--bg); }
      .bub { position:absolute; left:14px; width:220px; padding:12px 14px; border-radius:18px; font-size:22px; font-weight:700; border:4px solid var(--bg); background:var(--ink); }
      #bubA { top:100px; }
      #bubB { top:250px; left:40px; background:var(--green); }
      #receipt { left:640px; top:360px; width:330px; height:430px; padding:28px 26px; clip-path:polygon(0 0,100% 0,100% 94%,90% 100%,80% 94%,70% 100%,60% 94%,50% 100%,40% 94%,30% 100%,20% 94%,10% 100%,0 94%); }
      #receipt h4 { font-size:30px; font-weight:900; letter-spacing:.06em; }
      #receipt p { font-size:24px; margin-top:16px; font-weight:700; }
      #receipt .ok { margin-top:28px; display:inline-block; background:var(--green); padding:8px 14px; border:4px solid var(--bg); font-weight:900; font-size:26px; }
      #postit { left:330px; top:880px; width:260px; height:250px; background:var(--green); color:var(--bg); padding:26px 22px; border:6px solid var(--bg); box-shadow:8px 8px 0 var(--ink); }
      #postit b { font-size:34px; display:block; font-weight:900; }
      #postit span { font-size:24px; display:block; margin-top:14px; font-weight:700; }
      #folder { left:600px; top:880px; width:310px; height:230px; }
      #vidfile { left:700px; top:760px; width:110px; height:130px; }

      /* ── laptop (escenas 2 y 5) ── */
      .lap { position:absolute; left:120px; top:400px; width:760px; height:640px; }
      .lap .scr { position:absolute; left:0; top:0; width:760px; height:500px; background:var(--steel); border:8px solid var(--ink); border-radius:26px; padding:16px; box-shadow:8px 8px 0 var(--mint); }
      .lap .in { width:100%; height:100%; background:var(--ink); color:var(--bg); border-radius:12px; overflow:hidden; position:relative; }
      .lap .base { position:absolute; left:-30px; top:500px; width:820px; height:50px; background:var(--grey); border:8px solid var(--ink); border-radius:0 0 30px 30px; }
      .lap .bar { height:82px; background:var(--bg); color:var(--ink); font-weight:900; font-size:40px; padding:18px 26px; position:relative; }
      #uline { position:absolute; left:26px; top:66px; width:330px; height:8px; background:var(--mint); transform-origin:0 50%; }
      .mcard { position:absolute; left:26px; top:110px; width:430px; height:250px; background:var(--ink); border:6px solid var(--bg); box-shadow:6px 6px 0 var(--green); padding:22px; }
      .mcard b { font-size:36px; font-weight:900; display:block; }
      .mcard .cc { margin-top:20px; width:180px; height:110px; background:var(--mint); border:5px solid var(--bg); border-radius:14px; position:relative; }
      .mcard .cc i { position:absolute; left:18px; top:20px; width:46px; height:34px; background:var(--green); border:4px solid var(--bg); border-radius:6px; }
      .mcard .cc u { position:absolute; left:18px; bottom:16px; width:120px; height:10px; background:var(--bg); }
      .mcard .pay { position:absolute; right:20px; bottom:22px; background:var(--bg); color:var(--ink); font-weight:900; font-size:24px; padding:12px 16px; }
      .avs { position:absolute; left:490px; top:120px; width:200px; }
      .avs b { display:block; font-size:24px; font-weight:900; margin-bottom:10px; }
      .av { width:84px; height:84px; border-radius:50%; border:6px solid var(--bg); display:inline-grid; place-items:center; font-weight:900; font-size:36px; margin:0 6px 10px 0; }

      /* ── escena 3: el muro ── */
      #wallT { left:90px; top:280px; font-size:64px; font-weight:900; }
      .post { position:absolute; left:90px; width:800px; height:180px; padding:22px 26px 22px 140px; }
      .post .pa { position:absolute; left:26px; top:34px; width:90px; height:90px; border-radius:50%; border:6px solid var(--bg); display:grid; place-items:center; font-weight:900; font-size:40px; }
      .post b { font-size:28px; font-weight:900; display:block; }
      .post span { font-size:32px; font-weight:700; display:block; margin-top:8px; }
      .slot { position:absolute; left:90px; width:800px; height:180px; border:5px dashed var(--grey); }
      #reply { left:300px; top:1060px; padding:14px 22px; font-size:30px; font-weight:900; background:var(--mint); color:var(--bg); border:6px solid var(--bg); box-shadow:6px 6px 0 var(--ink); }

      /* ── escena 4: en vivo ── */
      #liveT { left:90px; top:280px; font-size:56px; font-weight:900; }
      #mic { left:110px; top:430px; width:380px; height:660px; }
      #vivo { left:205px; top:650px; padding:10px 18px; background:var(--bg); color:var(--ink); font-weight:900; font-size:34px; border:5px solid var(--ink); }
      #vivo i { display:inline-block; width:22px; height:22px; border-radius:50%; background:#e5484d; margin-right:10px; vertical-align:-2px; }
      #rec { left:560px; top:420px; padding:12px 22px; background:#e5484d; color:var(--ink); font-weight:900; font-size:40px; border:6px solid var(--bg); box-shadow:6px 6px 0 var(--ink); }
      #mfold { left:560px; top:560px; width:330px; height:220px; }
      #mfoldL { left:575px; top:700px; font-size:26px; font-weight:900; color:var(--bg); }
      #recvid { left:660px; top:500px; width:100px; height:118px; }
      #yt { left:520px; top:860px; width:160px; height:112px; background:#e5484d; border:6px solid var(--ink); border-radius:30px; display:grid; place-items:center; }
      #fb { left:790px; top:852px; width:128px; height:128px; background:#3b6fd9; border:6px solid var(--ink); border-radius:50%; display:grid; place-items:center; color:var(--ink); font-weight:900; font-size:86px; font-family:"Archivo Black",sans-serif; }
      #arrows { left:0; top:0; width:1080px; height:1920px; }

      /* ── escena 5: el club ── */
      #s5 .bar { font-size:36px; }
      .feat { position:absolute; left:30px; width:660px; font-size:34px; font-weight:900; padding:14px 18px; border:5px solid var(--bg); background:var(--ink); box-shadow:5px 5px 0 var(--mint); }
      #seal { left:300px; top:470px; width:400px; height:400px; }

      /* ── escena 6: escritorio limpio + CTA ── */
      #logo { left:300px; top:270px; width:480px; height:auto; filter:drop-shadow(0 0 3px #0e1317) drop-shadow(0 0 3px #0e1317); }
      #ctaT { left:0; top:390px; width:1080px; text-align:center; font-size:92px; font-weight:900; line-height:1.05; }
      #url { left:200px; top:530px; width:680px; text-align:center; font-size:68px; font-weight:900; padding:14px 0; }
      #wait { left:0; top:670px; width:1080px; text-align:center; font-size:36px; font-weight:700; color:var(--ink); }
      .lap.small { left:300px; top:770px; width:480px; height:380px; }
      .lap.small .scr { width:480px; height:320px; }
      .lap.small .base { top:320px; width:540px; left:-30px; height:40px; }
      .lap.small .bar { font-size:30px; height:66px; padding:14px 20px; }
      #check { left:150px; top:96px; width:140px; height:140px; }
      #mug { left:820px; top:1040px; width:100px; height:110px; }
      #plant { left:120px; top:1000px; width:120px; height:150px; }

      /* ── cortinillas ── */
      .tr { position:absolute; left:0; top:0; width:1080px; height:1920px; overflow:hidden; }
      .sl { position:absolute; left:-200px; width:1480px; height:330px; border-top:8px solid var(--bg); border-bottom:8px solid var(--bg); }
      .vc { position:absolute; top:-200px; width:260px; height:2320px; border-left:8px solid var(--bg); border-right:8px solid var(--bg); }
      #glyph2 { left:290px; top:710px; width:500px; height:440px; }
      #glyph4 { left:0; top:780px; width:1080px; text-align:center; font-size:300px; font-weight:900; color:var(--bg); font-family:"Archivo Black",sans-serif; }
      #recdisc { left:-1150px; top:-200px; width:3380px; height:3380px; border-radius:50%; background:var(--mint); border:30px solid var(--bg); }
      #recglyph { left:0; top:820px; width:1080px; text-align:center; font-size:220px; font-weight:900; color:var(--bg); font-family:"Archivo Black",sans-serif; }

      /* ── karaoke: una línea, 72 px ── */
      .cap { position:absolute; left:60px; top:1220px; width:860px; height:110px; display:flex; align-items:center; justify-content:center; z-index:50; }
      .capin { background:var(--bg); border:6px solid var(--mint); padding:6px 22px; box-shadow:8px 8px 0 var(--green); white-space:nowrap; font-size:72px; font-weight:900; line-height:1.15; }
      .w { color:var(--grey); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="37" data-width="1080" data-height="1920">
      <!-- fondo: retícula de puntos y cruces que se desliza (un tween lineal, finito) -->
      <div id="bgwrap" class="clip" data-start="0" data-duration="37" data-track-index="0">
        <svg width="1080" height="2300" viewBox="0 0 1080 2300">
          <defs>
            <pattern id="dots" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="15" cy="15" r="4" fill="#7c8a8e" />
              <path d="M45 39v12M39 45h12" stroke="#26313a" stroke-width="4" />
            </pattern>
          </defs>
          <rect width="1080" height="2300" fill="url(#dots)" />
        </svg>
      </div>

      <div id="stage" class="clip" data-start="0" data-duration="37" data-track-index="1">
        <div id="desk"></div><div id="deskLeg1"></div><div id="deskLeg2"></div>

        <!-- ESCENA 1 · escritorio revuelto -->
        <div id="s1" class="clip abs" data-start="0" data-duration="7.3" data-track-index="2" style="left:0;top:0;width:1080px;height:1920px">
          <div id="chip1" class="abs chip">Así das clases hoy</div>
          <div id="receipt" class="abs card">
            <h4 class="mono">COMPROBANTE</h4>
            <p>Transferencia SPEI</p>
            <p>Concepto: clase del jueves</p>
            <span class="ok">Recibido ✓</span>
          </div>
          <div id="phone" class="abs card">
            <div class="scr" data-layout-ignore>
              <div class="hdr">WhatsApp</div>
              <div id="bubA" class="bub">¿Me pasas el link de la clase?</div>
              <div id="bubB" class="bub mono">zoom.us/j/88412</div>
            </div>
          </div>
          <div id="folder" class="abs">
            <svg width="310" height="230" viewBox="0 0 310 230">
              <path d="M8 40 h110 l24 -26 h160 v208 h-294 z" fill="#85ddcb" stroke="#0e1317" stroke-width="8" stroke-linejoin="round" />
              <rect x="8" y="60" width="294" height="162" fill="#85ddcb" stroke="#0e1317" stroke-width="8" />
              <text x="155" y="150" text-anchor="middle" font-family="Inter" font-weight="900" font-size="34" fill="#0e1317">Drive</text>
              <text x="155" y="192" text-anchor="middle" font-family="Inter" font-weight="700" font-size="24" fill="#0e1317">Grabaciones</text>
            </svg>
          </div>
          <div id="vidfile" class="abs">
            <svg width="110" height="130" viewBox="0 0 110 130">
              <path d="M8 8 h64 l30 30 v84 h-94 z" fill="#f2f5f4" stroke="#0e1317" stroke-width="7" stroke-linejoin="round" />
              <path d="M42 58 l28 18 l-28 18 z" fill="#0e1317" />
            </svg>
          </div>
          <div id="postit" class="abs">
            <b>¡link de zoom!</b>
            <span class="mono">zoom.us/j/88412</span>
            <span>pásalo al grupo</span>
          </div>
        </div>

        <!-- ESCENA 2 · todo entra a la laptop: tu comunidad de pago -->
        <div id="s2" class="clip abs" data-start="6.6" data-duration="7.1" data-track-index="3" style="left:0;top:0;width:1080px;height:1920px">
          <div id="lap2" class="lap">
            <div class="scr"><div class="in">
              <div class="bar">Tu comunidad<div id="uline"></div></div>
              <div class="mcard">
                <b>Membresía mensual</b>
                <div class="cc"><i></i><u></u></div>
                <div class="pay">Pagar con tarjeta</div>
              </div>
              <div class="avs">
                <b>Miembros</b>
                <div id="av1" class="av" style="background:#85ddcb">A</div><div id="av2" class="av" style="background:#8dcf6e">L</div><div id="av3" class="av" style="background:#7c8a8e;color:#f2f5f4">M</div>
              </div>
            </div></div>
            <div class="base"></div>
          </div>
        </div>

        <!-- ESCENA 3 · el muro -->
        <div id="s3" class="clip abs" data-start="13.7" data-duration="4.72" data-track-index="4" style="left:0;top:0;width:1080px;height:1920px">
          <div id="wallT" class="abs">El muro</div>
          <div class="slot" style="top:420px"></div><div class="slot" style="top:630px"></div><div class="slot" style="top:840px"></div>
          <div id="p1" class="post card" data-layout-allow-overlap style="top:420px"><div class="pa" style="background:#85ddcb">A</div><b>Ana</b><span>Armé mi primer agente 🎉</span></div>
          <div id="p2" class="post card" data-layout-allow-overlap style="top:630px"><div class="pa" style="background:#8dcf6e">L</div><b>Luis</b><span>Así quedó mi bot de citas</span></div>
          <div id="p3" class="post card" data-layout-allow-overlap style="top:840px"><div class="pa" style="background:#7c8a8e;color:#f2f5f4">M</div><b>Mar</b><span>¿Cómo lo conecto a WhatsApp?</span></div>
          <div id="reply" class="abs">↳ Lo vemos en la llamada</div>
        </div>

        <!-- ESCENA 4 · en vivo, se graba y sale a YouTube y Facebook -->
        <div id="s4" class="clip abs" data-start="18.42" data-duration="7.98" data-track-index="5" style="left:0;top:0;width:1080px;height:1920px">
          <div id="liveT" class="abs">En vivo, desde tu página</div>
          <div id="mic" class="abs">
            <svg width="380" height="660" viewBox="0 0 380 660">
              <path d="M60 300 q0 150 130 150 q130 0 130 -150" fill="none" stroke="#f2f5f4" stroke-width="18" stroke-linecap="round" />
              <rect x="176" y="450" width="28" height="130" fill="#7c8a8e" stroke="#f2f5f4" stroke-width="6" />
              <rect x="90" y="580" width="200" height="40" rx="12" fill="#7c8a8e" stroke="#f2f5f4" stroke-width="8" />
              <rect x="105" y="40" width="170" height="350" rx="85" fill="#85ddcb" stroke="#f2f5f4" stroke-width="12" />
              <path d="M140 120 h100 M140 160 h100 M140 200 h100" stroke="#0e1317" stroke-width="12" stroke-linecap="round" />
            </svg>
          </div>
          <div id="vivo" class="abs"><i></i>VIVO</div>
          <div id="rec" class="abs">● REC</div>
          <div id="mfold" class="abs">
            <svg width="330" height="220" viewBox="0 0 330 220">
              <path d="M8 36 h110 l24 -26 h180 v202 h-314 z" fill="#8dcf6e" stroke="#0e1317" stroke-width="8" stroke-linejoin="round" />
              <rect x="8" y="56" width="314" height="156" fill="#8dcf6e" stroke="#0e1317" stroke-width="8" />
            </svg>
          </div>
          <div id="mfoldL" class="abs">Para tus miembros</div>
          <div id="recvid" class="abs">
            <svg width="100" height="118" viewBox="0 0 110 130">
              <path d="M8 8 h64 l30 30 v84 h-94 z" fill="#f2f5f4" stroke="#0e1317" stroke-width="7" stroke-linejoin="round" />
              <path d="M42 58 l28 18 l-28 18 z" fill="#0e1317" />
            </svg>
          </div>
          <svg id="arrows" class="abs" width="1080" height="1920" viewBox="0 0 1080 1920">
            <path id="arYT" d="M420 790 Q 470 880 520 910" fill="none" stroke="#f2f5f4" stroke-width="12" stroke-linecap="round" stroke-dasharray="200" stroke-dashoffset="200" />
            <path id="arFB" d="M420 820 Q 650 1100 820 990" fill="none" stroke="#f2f5f4" stroke-width="12" stroke-linecap="round" stroke-dasharray="560" stroke-dashoffset="560" />
          </svg>
          <div id="yt" class="abs"><svg width="60" height="60" viewBox="0 0 60 60"><path d="M18 10 l32 20 l-32 20 z" fill="#f2f5f4" /></svg></div>
          <div id="fb" class="abs">f</div>
        </div>

        <!-- ESCENA 5 · ya lo usa el Club de Agentes de IA -->
        <div id="s5" class="clip abs" data-start="26.3" data-duration="4.05" data-track-index="6" style="left:0;top:0;width:1080px;height:1920px">
          <div id="lap5" class="lap">
            <div class="scr"><div class="in">
              <div class="bar">Club de Agentes de IA</div>
              <div class="feat" style="top:110px">🎙 Llamada en vivo cada semana</div>
              <div class="feat" style="top:210px">🧱 Muro de miembros</div>
              <div class="feat" style="top:310px">🎥 Todas las grabaciones</div>
            </div></div>
            <div class="base"></div>
          </div>
          <div id="seal" class="abs" data-layout-allow-overlap>
            <svg width="400" height="400" viewBox="0 0 400 400">
              <defs><path id="ring" d="M200 200 m-150 0 a150 150 0 1 1 300 0 a150 150 0 1 1 -300 0" /></defs>
              <circle cx="200" cy="200" r="190" fill="#8dcf6e" stroke="#0e1317" stroke-width="12" />
              <circle cx="200" cy="200" r="118" fill="none" stroke="#0e1317" stroke-width="8" />
              <text font-family="Inter" font-weight="900" font-size="30" fill="#0e1317" letter-spacing="3"><textPath href="#ring">CLUB DE AGENTES DE IA · CLUB DE AGENTES DE IA ·</textPath></text>
              <text x="200" y="190" text-anchor="middle" font-family="Inter" font-weight="900" font-size="46" fill="#0e1317">YA</text>
              <text x="200" y="240" text-anchor="middle" font-family="Inter" font-weight="900" font-size="46" fill="#0e1317">FUNCIONA</text>
            </svg>
          </div>
        </div>

        <!-- ESCENA 6 · escritorio limpio + CTA -->
        <div id="s6" class="clip abs" data-start="30.33" data-duration="6.67" data-track-index="7" style="left:0;top:0;width:1080px;height:1920px">
          <img id="logo" class="abs" src="assets/logo.png" alt="FixterGeek" />
          <div id="ctaT" class="abs">Abre tu comunidad</div>
          <div id="url" class="abs chip">fixtergeek.com</div>
          <div id="wait" class="abs">Lista de espera · abrimos por tandas</div>
          <div id="plant" class="abs">
            <svg width="120" height="150" viewBox="0 0 120 150">
              <path d="M60 80 q-40 -20 -46 -66 q40 6 46 66 z" fill="#8dcf6e" stroke="#0e1317" stroke-width="6" />
              <path d="M60 80 q36 -26 50 -64 q-44 10 -50 64 z" fill="#85ddcb" stroke="#0e1317" stroke-width="6" />
              <path d="M24 84 h72 l-10 62 h-52 z" fill="#7c8a8e" stroke="#f2f5f4" stroke-width="6" stroke-linejoin="round" />
            </svg>
          </div>
          <div id="lap6" class="lap small">
            <div class="scr"><div class="in">
              <div class="bar">Tu comunidad</div>
              <svg id="check" class="abs" width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="62" fill="#8dcf6e" stroke="#0e1317" stroke-width="8" />
                <path id="checkP" d="M38 72 l22 22 l44 -46" fill="none" stroke="#0e1317" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="110" stroke-dashoffset="110" />
              </svg>
            </div></div>
            <div class="base"></div>
          </div>
          <div id="mug" class="abs">
            <svg width="100" height="110" viewBox="0 0 100 110">
              <path d="M70 40 q26 0 26 22 q0 22 -26 22" fill="none" stroke="#f2f5f4" stroke-width="10" />
              <rect x="8" y="24" width="66" height="80" rx="10" fill="#85ddcb" stroke="#f2f5f4" stroke-width="8" />
            </svg>
          </div>
        </div>
      </div>

      <!-- cortinilla 2: rebanadas sesgadas + glifo de muro -->
      <div id="t2" class="clip tr" data-start="13.2" data-duration="0.85" data-track-index="10" style="z-index:40">
        <div class="sl" style="top:-120px;background:#85ddcb"></div>
        <div class="sl" style="top:190px;background:#8dcf6e"></div>
        <div class="sl" style="top:500px;background:#f2f5f4"></div>
        <div class="sl" style="top:810px;background:#85ddcb"></div>
        <div class="sl" style="top:1120px;background:#8dcf6e"></div>
        <div class="sl" style="top:1430px;background:#f2f5f4"></div>
        <div class="sl" style="top:1740px;background:#85ddcb"></div>
        <svg id="glyph2" class="abs" width="500" height="440" viewBox="0 0 500 440">
          <path d="M40 30 h420 v290 h-250 l-110 90 v-90 h-60 z" fill="#0e1317" stroke="#f2f5f4" stroke-width="12" stroke-linejoin="round" />
          <path d="M110 120 h280 M110 200 h200" stroke="#85ddcb" stroke-width="26" stroke-linecap="round" />
        </svg>
      </div>

      <!-- cortinilla 3: el disco REC tapa todo y se encoge en la placa VIVO -->
      <div id="t3" class="clip tr" data-start="17.95" data-duration="0.85" data-track-index="11" style="z-index:40">
        <div id="recdisc" class="abs"></div>
        <div id="recglyph" class="abs">● REC</div>
      </div>

      <!-- cortinilla 4: columnas verticales + «</>» -->
      <div id="t4" class="clip tr" data-start="26.0" data-duration="0.85" data-track-index="12" style="z-index:40">
        <div class="vc" style="left:-360px;background:#85ddcb"></div>
        <div class="vc" style="left:-120px;background:#8dcf6e"></div>
        <div class="vc" style="left:120px;background:#f2f5f4"></div>
        <div class="vc" style="left:360px;background:#85ddcb"></div>
        <div class="vc" style="left:600px;background:#8dcf6e"></div>
        <div class="vc" style="left:840px;background:#f2f5f4"></div>
        <div class="vc" style="left:1080px;background:#85ddcb"></div>
        <div id="glyph4" class="abs">&lt;/&gt;</div>
      </div>

      <!--CAPTIONS-->
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const T = (sel, vars, at) => tl.to(sel, vars, at);

      // fondo: un solo tween lineal
      tl.fromTo("#bgwrap", { y: 0 }, { y: -300, duration: 37, ease: "none" }, 0);

      // ── ESCENA 1 (fotograma 0 completo: todo ya está; sólo se mueve) ──
      tl.set("#phone", { rotation: -9 }, 0);
      tl.set("#receipt", { rotation: 7 }, 0);
      tl.set("#postit", { rotation: -6 }, 0);
      tl.set("#folder", { rotation: 4 }, 0);
      tl.set("#chip1", { rotation: -2 }, 0);
      tl.set("#bubB", { scale: 0, transformOrigin: "0% 50%" }, 0);
      tl.set("#vidfile", { y: -260, rotation: -20, opacity: 0 }, 0);
      // flotan apenas (vivos desde el cuadro 0)
      tl.fromTo("#phone", { y: 0 }, { y: -10, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: 3 }, 0);
      tl.fromTo("#receipt", { y: 0 }, { y: 8, duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: 3 }, 0.2);
      // «cobras por transferencia»: el recibo se sacude
      tl.to("#receipt", { rotation: 13, duration: 0.09, yoyo: true, repeat: 5, ease: "power1.inOut" }, 1.28);
      // «link de Zoom»: el post-it se levanta
      tl.to("#postit", { y: -40, rotation: -14, duration: 0.25, ease: "power2.out" }, 3.36);
      tl.to("#postit", { y: 0, rotation: -6, duration: 0.35, ease: "back.out(2)" }, 3.62);
      // «WhatsApp»: vibra y entra la burbuja con el link
      tl.to("#phone", { x: 8, duration: 0.05, yoyo: true, repeat: 7, ease: "none" }, 4.40);
      tl.to("#bubB", { scale: 1, duration: 0.4, ease: "back.out(2)" }, 4.32);
      // «Drive»: el video cae en la carpeta
      tl.to("#vidfile", { opacity: 1, duration: 0.05 }, 5.95);
      tl.to("#vidfile", { y: 150, rotation: 0, duration: 0.35, ease: "power2.in" }, 5.95);
      tl.to("#folder", { scaleY: 0.9, duration: 0.08, yoyo: true, repeat: 1, transformOrigin: "50% 100%" }, 6.30);
      // todo vuela a la laptop
      const cx = 500, cy = 650;
      [["#phone", 230], ["#receipt", 805], ["#postit", 460], ["#folder", 755], ["#vidfile", 755], ["#chip1", 400]].forEach(([s, ox], i) => {
        tl.to(s, { x: cx - ox, y: (s === "#chip1" ? cy - 310 : cy - 760), scale: 0.08, rotation: 0, duration: 0.4, ease: "power3.in" }, 6.5 + i * 0.04);
      });

      // ── ESCENA 2 ──
      tl.fromTo("#lap2", { y: 760 }, { y: 0, duration: 0.55, ease: "back.out(1.4)", immediateRender: false }, 6.75);
      tl.set("#lap2", { y: 760 }, 0);
      tl.fromTo("#stage", { scale: 1.07 }, { scale: 1, duration: 0.35, ease: "power2.out", transformOrigin: "50% 40%", immediateRender: false }, 7.18);
      tl.set("#uline", { scaleX: 0 }, 0);
      tl.to("#uline", { scaleX: 1, duration: 0.45, ease: "power2.out" }, 8.96);
      ["#av1", "#av2", "#av3"].forEach((s, i) => {
        tl.set(s, { scale: 0 }, 0);
        tl.to(s, { scale: 1, duration: 0.4, ease: "back.out(2.2)" }, [10.72, 11.28, 11.98][i]);
      });
      tl.fromTo("#lap2 .mcard", { rotation: 0 }, { rotation: -2, duration: 0.15, yoyo: true, repeat: 1, ease: "power1.inOut", immediateRender: false }, 12.72);

      // ── cortinilla 2 ──
      document.querySelectorAll("#t2 .sl").forEach((el, i) => {
        tl.set(el, { x: -1600, skewY: -8 }, 0);
        tl.to(el, { x: 0, duration: 0.32, ease: "back.out(1.3)" }, 13.2 + i * 0.025);
        tl.to(el, { x: 1700, duration: 0.3, ease: "power3.in" }, 13.72 + i * 0.025);
      });
      tl.set("#glyph2", { scale: 0 }, 0);
      tl.to("#glyph2", { scale: 1.15, duration: 0.2, ease: "back.out(2.5)" }, 13.5);
      tl.to("#glyph2", { scale: 0, duration: 0.18, ease: "power2.in" }, 13.75);

      // ── ESCENA 3 (cada post cae: el golpe en 1/(s+1) del tween = palabra) ──
      [["#p1", 14.24, -6], ["#p2", 14.88, 5], ["#p3", 16.32, -4]].forEach(([s, t, r]) => {
        tl.set(s, { y: -900, rotation: r * 3 }, 0);
        tl.to(s, { y: 0, rotation: r * 0.3, duration: 0.5, ease: "back.out(1.6)" }, t - 0.19);
      });
      tl.set("#reply", { scale: 0, transformOrigin: "0% 50%" }, 0);
      tl.to("#reply", { scale: 1, duration: 0.35, ease: "back.out(2)" }, 17.45);

      // ── cortinilla 3: disco REC ──
      tl.set("#recdisc", { scale: 0 }, 0);
      tl.to("#recdisc", { scale: 1, duration: 0.42, ease: "power3.in" }, 17.98);
      tl.set("#recglyph", { scale: 0 }, 0);
      tl.to("#recglyph", { scale: 1, duration: 0.15, ease: "back.out(2)" }, 18.36);
      tl.to("#recglyph", { scale: 0, duration: 0.15 }, 18.5);
      tl.to("#recdisc", { scale: 0, x: -330, y: -500, duration: 0.3, ease: "power3.out" }, 18.5);

      // ── ESCENA 4 ──
      tl.set("#vivo", { scale: 0 }, 0);
      tl.to("#vivo", { scale: 1, duration: 0.35, ease: "back.out(2)" }, 19.45);
      tl.fromTo("#mic", { rotation: 0 }, { rotation: -3, duration: 0.6, yoyo: true, repeat: 5, ease: "sine.inOut", svgOrigin: "190 620", immediateRender: false }, 19.6);
      tl.set("#rec", { scale: 0 }, 0);
      tl.to("#rec", { scale: 1, duration: 0.3, ease: "back.out(2.2)" }, 21.95);
      tl.to("#rec", { opacity: 0.4, duration: 0.3, yoyo: true, repeat: 5 }, 22.3);
      tl.set("#recvid", { y: -60, scale: 0 }, 0);
      tl.to("#recvid", { scale: 1, duration: 0.2 }, 22.4);
      tl.to("#recvid", { y: 120, duration: 0.4, ease: "power2.in" }, 22.5);
      tl.to("#recvid", { scale: 0, duration: 0.12 }, 22.9);
      tl.to("#arYT", { strokeDashoffset: 0, duration: 0.4, ease: "power2.out" }, 23.92);
      tl.set("#yt", { scale: 0 }, 0);
      tl.to("#yt", { scale: 1, duration: 0.35, ease: "back.out(2.2)" }, 24.1);
      tl.to("#arFB", { strokeDashoffset: 0, duration: 0.4, ease: "power2.out" }, 24.48);
      tl.set("#fb", { scale: 0 }, 0);
      tl.to("#fb", { scale: 1, duration: 0.35, ease: "back.out(2.2)" }, 24.66);

      // ── cortinilla 4: columnas ──
      document.querySelectorAll("#t4 .vc").forEach((el, i) => {
        tl.set(el, { y: -2400, skewX: -10 }, 0);
        tl.to(el, { y: 0, duration: 0.33, ease: "back.out(1.2)" }, 26.0 + i * 0.03);
        tl.to(el, { y: 2500, duration: 0.3, ease: "power3.in" }, 26.52 + i * 0.03);
      });
      tl.set("#glyph4", { scale: 0 }, 0);
      tl.to("#glyph4", { scale: 1, duration: 0.2, ease: "back.out(2.5)" }, 26.3);
      tl.to("#glyph4", { scale: 0, duration: 0.15 }, 26.55);

      // ── ESCENA 5: el sello cae grande al centro ──
      document.querySelectorAll("#lap5 .feat").forEach((el, i) => {
        tl.set(el, { x: -800 }, 0);
        tl.to(el, { x: 0, duration: 0.35, ease: "power3.out" }, 26.75 + i * 0.25);
      });
      tl.set("#seal", { scale: 3, rotation: 20, opacity: 0 }, 0);
      tl.to("#seal", { opacity: 1, duration: 0.05 }, 27.95);
      tl.to("#seal", { scale: 1, rotation: -12, duration: 0.45, ease: "back.out(1.5)" }, 28.12);
      tl.fromTo("#lap5", { y: 0 }, { y: 10, duration: 0.08, yoyo: true, repeat: 1, immediateRender: false }, 28.3);
      // empujón dentro de la pantalla (cortinilla 5)
      tl.to("#s5", { scale: 7, duration: 0.38, ease: "power3.in", transformOrigin: "500px 650px" }, 29.95);

      // ── ESCENA 6 ──
      tl.fromTo("#s6", { scale: 1.4 }, { scale: 1, duration: 0.4, ease: "back.out(1.3)", transformOrigin: "50% 45%", immediateRender: false }, 30.33);
      tl.set("#url", { scale: 0 }, 0);
      tl.to("#url", { scale: 1, duration: 0.35, ease: "back.out(2)" }, 31.38);
      tl.set("#wait", { opacity: 0, y: 20 }, 0);
      tl.to("#wait", { opacity: 1, y: 0, duration: 0.4 }, 32.0);
      tl.to("#checkP", { strokeDashoffset: 0, duration: 0.45, ease: "power2.out" }, 33.76);
      tl.fromTo("#plant", { rotation: 0 }, { rotation: 4, duration: 0.9, yoyo: true, repeat: 3, ease: "sine.inOut", transformOrigin: "50% 100%", immediateRender: false }, 31);
      tl.fromTo("#logo", { y: 0 }, { y: -6, duration: 1, yoyo: true, repeat: 3, ease: "sine.inOut", immediateRender: false }, 32.5);

      // karaoke
      /*CAPJS*/

      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
