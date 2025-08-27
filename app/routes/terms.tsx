import { useEffect } from "react";
import type { Route } from "../+types/root";
import { Footer } from "~/components/Footer";
import { cn } from "~/utils/cn";

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
          Términos y Condiciones de Uso
        </h2>
        <p className="mt-6">Última actualización: 27 de mayo de 2025</p>
        <p className="mt-6">
          {" "}
          Bienvenido a Fixter Geek. Estos Términos y Condiciones regulan el uso
          del sitio web https://www.fixtergeek.com (en adelante, el “Sitio”),
          propiedad de Fixter Geek con domicilio en Jalapa 101, Roma Norte,
          CDMX, en cumplimiento con la legislación aplicable en los Estados
          Unidos Mexicanos.
        </p>
        <p className="mt-6">
          Al acceder o utilizar este Sitio, usted (el “Usuario”) declara haber
          leído, entendido y aceptado estos Términos y Condiciones. Si no está
          de acuerdo, debe abstenerse de utilizar el Sitio.
        </p>
        <Bullet
          title="1. Uso del Sitio"
          points={[
            "El Usuario se obliga a utilizar este Sitio conforme a lo establecido en la legislación mexicana vigente, la moral, el orden público y los presentes Términos y Condiciones.",
            "El Usuario se abstendrá de utilizar el Sitio con fines o efectos ilícitos, lesivos de derechos o intereses de terceros, o que de cualquier forma puedan dañar, inutilizar o deteriorar el Sitio o impedir su normal funcionamiento.",
          ]}
        />
        <Bullet
          title="2. Registro y cuentas de usuario"
          points={[
            "Algunas funcionalidades del Sitio pueden requerir el registro del Usuario. Este deberá proporcionar información veraz, actualizada y completa.",
            "El Usuario será responsable de mantener la confidencialidad de sus datos de acceso, así como de cualquier actividad realizada desde su cuenta.",
            "Fixter Geek podrá suspender o cancelar cuentas en caso de uso indebido, sospecha de fraude o incumplimiento de estos términos.",
          ]}
        />
        <Bullet
          title="3. Servicios"
          points={[
            "Fixter Geek ofrece servicios de venta de componentes y asesoría tecnológica, entre otros.",
            "Todos los precios publicados están expresados en pesos mexicanos e incluyen el Impuesto al Valor Agregado (IVA), salvo que se indique lo contrario.",
            "El cumplimiento de garantías, devoluciones, cambios y demás derechos del consumidor se ajustará a lo establecido por la Ley Federal de Protección al Consumidor.",
            "El Usuario podrá consultar los términos específicos de cada servicio al momento de la contratación.",
          ]}
        />
        <Bullet
          title="4. Propiedad intelectual"
          points={[
            "Todos los contenidos del Sitio, incluyendo logotipos, textos, imágenes, software, marcas y diseños son propiedad de Fixter Geek o de terceros con licencia, y están protegidos por las leyes mexicanas de propiedad industrial e intelectual.",
            "Queda prohibida la reproducción total o parcial, distribución, modificación o explotación comercial de estos contenidos sin autorización expresa y por escrito de Fixter Geek.",
          ]}
        />
        <Bullet
          title="5. Limitación de responsabilidad"
          points={[
            "El uso del Sitio es bajo el propio riesgo del Usuario. Fixter Geek no garantiza que el Sitio esté libre de errores, virus o interrupciones.",
            "Fixter Geek no será responsable por daños directos, indirectos o consecuentes derivados del uso o imposibilidad de uso del Sitio o de los servicios contratados, salvo que dichos daños sean resultado de dolo o culpa grave de la empresa.",
          ]}
        />
        <Bullet
          title="6. Enlaces a terceros"
          points={[
            "Este Sitio puede contener enlaces a sitios de terceros. Fixter Geek no controla ni es responsable del contenido, políticas o prácticas de dichos sitios. La inclusión de estos enlaces no implica ninguna relación, recomendación o respaldo.",
          ]}
        />
        <Bullet
          title="7. Protección de datos personales"
          points={[
            "La información personal recabada será tratada conforme a lo establecido en la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.",
            "Para más información, consulte nuestro Aviso de Privacidad donde se detallan los fines del tratamiento, medios para ejercer sus derechos ARCO, y las medidas de seguridad adoptadas.",
          ]}
        />
        <Bullet
          title="8. Modificaciones"
          points={[
            "Fixter Geek se reserva el derecho de modificar en cualquier momento los presentes Términos y Condiciones. Las modificaciones entrarán en vigor al ser publicadas en el Sitio. El uso continuo del Sitio implica la aceptación de dichas modificaciones.",
          ]}
        />
        <Bullet
          title="9. Legislación aplicable y jurisdicción"
          points={[
            "Estos Términos y Condiciones se rigen por las leyes vigentes en los Estados Unidos Mexicanos.",
            "En caso de controversia, el Usuario y Fixter Geek se someten a la jurisdicción de los tribunales competentes en la Ciudad de México, renunciando a cualquier otro fuero que pudiera corresponderles.",
          ]}
        />
        <div className="my-10">
          <h3 className="text-xl font-bold">10. Contacto</h3>
          <p className="text-iron text-base mb-4 ">
            Para cualquier duda, comentario o aclaración sobre estos Términos y
            Condiciones, puede contactarnos a través de:
          </p>
          <p>
            <strong>Correo electrónico:</strong>{" "}
            <a
              href="mailto:brenda@fixter.org"
              rel="norequired"
              target="_blank"
              className="text-brand-500"
            >
              brenda@fixtergeek.com
            </a>
          </p>
        </div>
      </div>{" "}
      <Footer />
    </section>
  );
}

export const Bullet = ({
  className,
  title,
  description,
  points = [],
}: {
  className?: string;
  title?: string;
  description?: string;
  points?: string[];
}) => {
  return (
    <div className="my-10">
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-iron text-base mb-4 ">{description}</p>
      <div className="">
        {points.map((point, index) => (
          <Point key={index} label={point} />
        ))}
      </div>
    </div>
  );
};

const Point = ({ label }: { label: string }) => {
  return <p>&bull; {label}</p>;
};
