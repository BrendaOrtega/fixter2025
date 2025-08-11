import { AiFillInstagram } from "react-icons/ai";
import { FaFacebook } from "react-icons/fa";
import { FaSquareXTwitter } from "react-icons/fa6";
import { Link } from "react-router";

export const Footer = () => {
  return (
    <div className="footer max-w-7xl mx-auto px-4 md:px-[5%] gap-10 xl:px-0 py-12 flex justify-between flex-wrap lg:flex-nowrap">
      <div className="w-full md:w-fit">
        <img className="w-28 md:w-40" alt="logo" src="/logo-full.png" />{" "}
      </div>
      <div className="flex flex-col gap-3 w-[40%] md:w-fit ">
        <h3 className="text-white font-mdedium">Sobre nosotros</h3>
        {/* <p className="text-colorCaption font-light">Nuestra historia</p> */}
        <a href="https://wa.me/527757609276" target="_blank" rel="noreferrer">
          <p className="text-colorCaption font-light hover:text-brand-500 transition-all">Contacto</p>
        </a>
        <Link to="/faq">
          <p className="text-colorCaption font-light hover:text-brand-500 transition-all">Preguntas Frecuentes</p>{" "}
        </Link>
        <Link to="/aviso-de-privacidad">
          <p className="text-colorCaption font-light hover:text-brand-500 transition-all">Aviso de Privacidad</p>{" "}
        </Link>
        <Link to="/terminos-y-condiciones">
          <p className="text-colorCaption font-light hover:text-brand-500 transition-all">Términos y condiciones</p>{" "}
        </Link>
      </div>
      <div className="flex flex-col gap-3  w-[40%] md:w-fit">
        <h3 className="text-white font-mdedium">Recursos</h3>
        <Link to="/libro">
          <p className="text-colorCaption font-light hover:text-brand-500 transition-all">Domina Claude Code</p>
        </Link>
        <Link to="/cursos">
          <p className="text-colorCaption font-light hover:text-brand-500 transition-all">Cursos</p>
        </Link>
        <Link to="/blog">
          <p className="text-colorCaption font-light hover:text-brand-500 transition-all">Blog</p>
        </Link>
        {/* <p className="text-colorCaption font-light">Guías</p> */}
      </div>
      <div className="flex flex-col gap-3  w-[40%] md:w-fit">
        <h3 className="text-white font-mdedium">Comunidad</h3>
        <a
          href="https://open.spotify.com/show/55lbn8mEhHb5lLHelmgDXU"
          target="_blank"
          rel="noreferrer"
        >
          <p className="text-colorCaption font-light">Podcast</p>
        </a>
        <span className="flex items-center gap-3 text-2xl text-colorCaption">
          <a
            href="https://www.facebook.com/fixterme/"
            title="facebook"
            target="_blank"
            rel="noreferrer"
          >
            <FaFacebook className=" hover:opacity-50 transition-all" />
          </a>
          <a
            href="https://www.instagram.com/fixtergeek/"
            title="instagram"
            target="_blank"
            rel="noreferrer"
          >
            <AiFillInstagram className="text-[28px] hover:opacity-50 transition-all" />
          </a>
          <a
            href="https://x.com/FixterGeek"
            title="x"
            target="_blank"
            rel="noreferrer"
          >
            <FaSquareXTwitter className="hover:opacity-50 transition-all" />
          </a>
        </span>
      </div>
    </div>
  );
};
