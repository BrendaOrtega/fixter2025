import { useEffect } from "react";
import type { Route } from "../+types/root";
import { Footer } from "~/components/Footer";
import { NavBar } from "~/components/common/NavBar";

export default function Route({}: Route.ComponentProps) {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, []);

  return (
    <section>
      <div className=" max-w-7xl mx-auto py-32 px-4 md:px-[5%] gap-10 xl:px-0 font-light text-colorParagraph ">
        <h2 className="text-white text-3xl md:text-4xl xl:text-5xl font-bold">
          Aviso de Privacidad
        </h2>
        <p className="mt-6">
          {" "}
          El presente documento constituye el Aviso de privacidad de Privacidad
          para efectos de lo dispuesto en la Ley Federal de Protección de Datos
          Personales en Posesión de los Particulares (la “LFPDP”) y las
          disposiciones que emanan de ella o se relacionan con la misma.
        </p>
        <p className="mt-6">
          {" "}
          Este Aviso de privacidad aplica a la información personal recopilada
          sobre el Titular por Fixter en su carácter de Responsable. Para los
          efectos del presente Aviso de privacidad, los términos que no estén
          contemplados en el mismo tendrán el significado que se les atribuye en
          la Ley Federal de Protección de Datos Personales en Posesión de los
          Particulares (LFPDP). El presente Aviso de privacidad tiene por objeto
          establecer términos y condiciones por medio de los cuales Fixter
          recibirá y protegerá los Datos Personales del Titular, a efecto de
          proteger su privacidad ; utilizará los Datos Personales del Titular, y
          /o realizará en su caso las transferencias sus Datos Personales a
          terceros.
        </p>
        <p className="mt-6">
          {" "}
          <strong>1. CONSENTIMIENTO DEL TITULAR. </strong>Para efectos de lo
          dispuesto en la LFPDP y en particular en su Artículo 17, el Titular
          manifiesta que:
          <ul className="">
            <li>
              1.-El presente Aviso de privacidad le ha sido dado a conocer por
              el Responsable.
            </li>
            <li>
              2.-Que ha leído, entendido y acordado los términos señalados en
              este Aviso de privacidad, por lo que otorga su consentimiento
              respecto al tratamiento de sus Datos Personales conforme lo
              establece la LFPDP y legislación aplicable.
            </li>
            <li>
              3.- Que en caso de que los Datos Personales recopilados incluyan
              Datos Personales sensibles o financieros, sean estos
              proporcionados en formato impreso, o utilizando medios
              electrónicos, son actos que constituyen su consentimiento expreso
              como su titular en términos del segundo párrafo del artículo 8 de
              la LFPDP y demás legislación aplicable.
            </li>
            <li>
              4.-Que otorga su consentimiento para que Netafim o sus Encargados
              realicen transferencias de Datos Personales a terceros nacionales
              o extranjeros, en el entendido de que el tratamiento que dichos
              terceros den a sus Datos Personales deberá ajustarse a lo
              establecido en este Aviso de privacidad.
            </li>
            <li>
              5.- Que en caso de que el Titular no se oponga a los términos del
              Aviso de privacidad se considerará acordado y consentido su
              contenido y que el consentimiento del Titular podrá ser revocado
              en cualquier momento por éste. No obstante cualquier disposición
              de este Aviso de privacidad, el Titular reconoce que no se
              requerirá de su consentimiento para el tratamiento de Datos
              Personales por parte del Responsable o de terceros en cualquiera
              de los casos señalados en el Artículo 10 de la LFPDP.
            </li>
          </ul>
        </p>
        <p className="mt-6">
          {" "}
          <strong>2. RECOLECCIÓN DE LOS DATOS PERSONALES.</strong> La
          recolección de Datos Personales podrá efectuarse, por comunicación vía
          telefónica con el Responsable o con sus Encargados, empleados o bien,
          mediante entrega directa al Responsable o mediante el uso de correos
          electrónicos y/o mensajes cortos de texto, o mediante la utilización
          de sus sitios Web, mediante el uso de herramientas de captura
          automática de datos. Las cuales permiten recolectar la información que
          envía su navegador a dichos sitios Web, tales como el tipo de
          navegador que utiliza, el idioma de usuario, y la dirección IP de
          sitios Web que utilizó para acceder a los sitios del Responsable o
          Encargados. Los siguientes son ejemplos, a título enunciativo mas no
          limitativo, de información que el Responsable puede recopilar: nombre
          y apellidos; fecha de nacimiento; domicilio, sea particular, del
          trabajo, o fiscal; dirección de correo electrónico, personal o del
          trabajo; nombre de identificación en redes sociales; número
          telefónico, particular o del trabajo; número de teléfono celular;
          número cuentas bancarias; clave del Registro Federal de Contribuyentes
          (RFC); Clave Única de Registro de Población (CURP). Dentro de la
          documentación que puede ser recolectada por Netafim para la
          verificación de la identidad del Titular de los Datos Personales se
          encuentra la credencial de elector; la cartilla de identidad del
          servicio militar nacional liberada; la cédula profesional; pasaporte;
          Forma migratoria; la cédula de registro en el RFC; la cédula de
          registro con la CURP; el comprobante de domicilio; el informe especial
          de crédito emitido por una Sociedad de Información Crediticia. Para el
          caso de postulantes a empleados podría también solicitarse, entre
          otros, el acta de nacimiento; comprobantes de estudios; el estado de
          cuenta de la Administradora de Fondos para el retiro (Afore); la hoja
          de retención de impuestos, así como de los estudio psicométrico,
          médico y socio-económico efectuados por Netafim. También le podrían
          ser solicitados los Datos Personales de sus familiares, dependientes o
          beneficiarios y la documentación comprobatoria conducente.
        </p>
        <p className="mt-6">
          {" "}
          <strong>3. FINALIDAD DE LOS DATOS PERSONALES.</strong> Los Datos
          Personales del Titular son recolectados y tratados por el Responsable
          o sus Encargados con la finalidad de permitirle al Titular, llevar a
          cabo las siguientes actividades con el Responsable: A) Solicitar,
          comprar, cambiar, o devolver productos, ofrecidos por Fixter; B)
          Solicitar, contratar, cambiar o cancelar servicios, ofrecidos por
          Fixter; C) Efectuar pagos en línea; D) Solicitar factura o comprobante
          fiscal digital; E) Solicitar una cotización, sobre productos y
          servicios; F) Solicitar la entrega, reparación o cumplimiento de
          garantía de productos; G) Contactar el Servicio de Atención a
          Clientes; H) Participar en encuestas; I) Utilizar los distintos
          servicios de sus correspondientes Sitios Web incluyendo la descarga de
          contenidos y formatos; J) Compartir sus comentarios o sugerencias
          sobre los productos y servicios; K) Procesar pagos, y L) Cualquier
          otra actividad de naturaleza análoga a las descritas en los incisos
          previamente citados. Asimismo, el Responsable, directamente o a través
          de sus Encargados, puede utilizar sus Datos Personales con la
          finalidad de: A) Realizar estudios sobre intereses y comportamiento de
          sus clientes, consumidores, proveedores, y de aquellos terceros con
          los que trate; B) Efectuar estudios de mercado y de consumo a efecto
          de adquirir y ofrecer productos y servicios personalizados, así como
          publicidad y contenidos más adecuados a las necesidades de sus
          clientes, consumidores, proveedores y otros terceros con los que
          trate; C) Elaborar estadísticas internas que indiquen los servicios y
          productos más apreciados por los diferentes segmentos de sus clientes,
          consumidores, proveedores; D) Formalizar el proceso transaccional con
          sus clientes, consumidores, proveedores y otros terceros con los que
          trate; E) Gestionar el proceso de requisición, evaluación y
          adjudicación de proveedores y otros terceros con los que trate; F) En
          su caso, verificar la capacidad de crédito y/o pago del Titular, lo
          cual se podrá efectuar a través de las sociedades de información
          crediticia, en términos de la Ley para regular las Sociedades de
          Información Crediticia; G) Comprobar las transacciones comerciales
          realizadas por el Titular con el Responsable; Para el caso de los
          postulantes a empleados de Netafim, se llevarán a cabo las siguientes
          actividades: A) Efectuar el proceso de reclutamiento y selección de
          personal; B) Realizar el proceso de contratación;
        </p>
        <p className="mt-6">
          {" "}
          <strong>
            4. RECOLECCIÓN DE DATOS AL NAVEGAR EN SITIOS Y PÁGINAS WEB DE
            NETAFIM.
          </strong>{" "}
          Dentro de las herramientas de captura automática de datos utilizadas
          por Fixter en sus sitios y páginas web se encuentran las cookies, los
          Web beacons, y los enlaces en los correos electrónicos. Vínculos en
          los correos electrónicos de Fixter.- Los correos electrónicos que
          incluyen vínculos que permiten a Fixter saber si usted activó dicho
          vínculo y visitó la página web de destino, pudiendo esta información
          ser incluida en su perfil. En caso de que usted prefiera que Fixter no
          recolecte información sobre su interacción con dichos vínculos, usted
          puede optar por modificar el formato de las comunicaciones de Fixter
          (por ejemplo, que el mensaje sea recibido en formato de texto y no en
          formato HTML) o puede hacer caso omiso del vínculo y no acceder a su
          contenido.
        </p>
        <p className="mt-6">
          {" "}
          <strong>5. TRANSFERENCIAS DE DATOS.</strong> Habiendo leído, entendido
          y acordado los términos expuestos en este Aviso de privacidad, el
          Titular manifiesta su consentimiento para que el Responsable o
          cualquier Encargado realicen transferencias de Datos Personales a
          terceros nacionales o extranjeros, en el entendido de que el
          tratamiento que dichos terceros den a los Datos Personales del Titular
          deberá ajustarse a lo establecido en este Aviso de privacidad.
        </p>
        <p className="mt-6">
          {" "}
          <strong>
            6. LIMITACIÓN DE USO Y DIVULGACIÓN DE LA INFORMACIÓN.{" "}
          </strong>
          El Responsable y/o sus Encargados conservarán los Datos Personales del
          Titular durante el tiempo que sea necesario para procesar sus
          solicitudes de información, productos y/o servicios, así como para
          mantener los registros contables, financieros y de auditoria en
          términos de la LFPDP y de la legislación mercantil, fiscal y
          administrativa vigente. Además de controlar la divulgación de dichos
          datos o información de socios comerciales. Los Datos Personales del
          Titular recolectados por el Responsable y/o sus Encargados se
          encontrarán protegidos por medidas de seguridad administrativas,
          técnicas y físicas adecuadas contra el daño, pérdida, alteración,
          destrucción o uso, acceso o tratamiento no autorizados, de conformidad
          con lo dispuesto en la LFPDP y de la regulación administrativa
          derivada de la misma. No obstante lo señalado anteriormente, Fixter no
          garantiza que terceros no autorizados no puedan tener acceso a los
          sistemas físicos o lógicos de los Titulares o del Responsable o en los
          documentos electrónicos y ficheros almacenados en sus sistemas. En
          consecuencia, Fixter no será en ningún caso responsable de los daños y
          perjuicios que pudieran derivarse de dicho acceso no autorizado.
        </p>
        <p className="mt-6">
          {" "}
          <strong>7. DEPARTAMENTO DE DATOS PERSONALES; DOMICILIO.</strong> Para
          cualquier comunicación acerca de nuestro Aviso de privacidad de
          Privacidad, por favor contacte a nuestro Departamento de Datos
          Personales: admin@fixter.org Para efectos de lo dispuesto en la
          fracción I del Artículo 16 de la LFPDP, el domicilio del Responsable
          es el establecido en esta Sección 7 del presente Aviso de privacidad.
        </p>
        <p className="mt-6">
          {" "}
          <strong>
            8. PROCEDIMIENTO PARA EJERCER LOS DERECHOS COMO TITULAR DE DATOS
            PERSONALES.{" "}
          </strong>{" "}
          Usted tiene, en todo momento, derecho de acceder, rectificar y
          cancelar sus datos personales, así como de oponerse al tratamiento de
          los mismos o revocar el consentimiento que para tal fin nos haya
          proporcionado presentando una solicitud con la información y
          documentación siguiente: 1.Nombre del Titular, domicilio, teléfono y
          Dirección de correo electrónico. 2.Los documentos que acrediten su
          identidad (copia simple en formato impreso o electrónico de su
          credencial de elector, cédula profesional, pasaporte o
          FormaMigratoria) o, en su caso, la representación legal del Titular
          copia simple en formato impreso o electrónico de la carta poder simple
          con firma autógrafa del Titular, el mandatario y sus correspondientes
          identificaciones 3.La descripción clara y precisa de los Datos
          Personales respecto de los que busca ejercer alguno de los Derechos.
          4.Cualquier otro elemento o documento que facilite la localización de
          los Datos Personales del Titular. En el caso de las solicitudes de
          rectificación de Datos Personales, el Titular respectivo deberá
          también indicar las modificaciones a realizarse y aportar la
          documentación que sustente su petición. El Responsable o sus
          Encargados le responderán al Titular respectivo en un plazo máximo de
          veinte días hábiles, contados desde la fecha en que se recibió la
          solicitud. Los plazos antes referidos podrán ser ampliados sólo en
          términos de la LFPDP. La entrega de los Datos Personales será
          gratuita, solamente le corresponderá cubrir los gastos justificados de
          envío o el costo de reproducción en copias u otros formatos. En el
          caso de que el Titular reitere su solicitud en un periodo menor a doce
          meses, deberá cubrir los costos correspondientes equivalentes a 1.5
          días de Salario Mínimo Vigente en el Distrito Federal en términos de
          la LFPDP, a menos que existan modificaciones sustanciales al Aviso de
          privacidad que motiven nuevas consultas. Para efectos de las
          solicitudes de cancelación de Datos Personales, además de lo dispuesto
          por el presente Aviso de privacidad, se estará a lo dispuesto en el
          Artículo 26 de la LFPDP, incluyendo los casos de excepción de
          cancelación de Datos Personales ahí señalados. La presentación de una
          solicitud de oposición del uso de Datos Personales por el Titular de
          los mismos, dará al Responsable la facultad de oponerse al uso de los
          Datos Personales que como Titular haya entregado al oponente.
        </p>
      </div>{" "}
      <Footer />
    </section>
  );
}
