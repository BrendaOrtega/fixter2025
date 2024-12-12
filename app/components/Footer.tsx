import { AiFillInstagram } from "react-icons/ai";
import { FaFacebook } from "react-icons/fa";
import { FaSquareXTwitter } from "react-icons/fa6";

export const Footer = () => {
  return (
    <div className="footer max-w-7xl mx-auto px-4 md:px-[5%] xl:px-0 py-12 flex justify-between">
      <img alt="logo" src="/full-logo.svg" />
      <div className="flex flex-col gap-3">
        <h3 className="text-white font-mdedium">Sobre nosotros</h3>
        <p className="text-colorCaption font-light">Nuestra historia</p>
        <p className="text-colorCaption font-light">Contacto</p>
        <p className="text-colorCaption font-light">Preguntas Frecuentes</p>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="text-white font-mdedium">Recursos</h3>
        <p className="text-colorCaption font-light">Cursos</p>
        <p className="text-colorCaption font-light">Blog</p>
        <p className="text-colorCaption font-light">Guías</p>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="text-white font-mdedium">Comunidad</h3>
        <p className="text-colorCaption font-light">Podcast</p>
        <span className="flex gap-3 text-2xl text-colorCaption">
          <FaFacebook />
          <AiFillInstagram />
          <FaSquareXTwitter />
        </span>
      </div>
    </div>
  );
};
