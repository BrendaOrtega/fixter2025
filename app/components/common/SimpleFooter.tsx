import {
  FaFacebook,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
} from "react-icons/fa";
import { FaSquareXTwitter, FaXTwitter } from "react-icons/fa6";
import { Link } from "react-router";
import { Youtube } from "../icons/Youtube";
import { BsLinkedin, BsYoutube } from "react-icons/bs";
import { AiFillInstagram } from "react-icons/ai";

export default function SimpleFooter() {
  return (
    <section className="mt-20 bg-brand-black-500 py-8  pb-20">
      <div className="flex justify-center items-center gap-3">
        <a
          rel="noreferrer"
          href="https://www.facebook.com/fixterme"
          target="_blank"
        >
          <FaFacebook className="text-colorCaption text-2xl hover:opacity-40 hover:scale-95" />
        </a>
        <a
          rel="noreferrer"
          href="https://twitter.com/FixterGeek"
          target="_blank"
        >
          <FaSquareXTwitter className="text-colorCaption text-2xl hover:opacity-40 hover:scale-95" />
        </a>
        <a
          rel="noreferrer"
          href="https://www.linkedin.com/company/fixtergeek/"
          target="_blank"
        >
          <BsLinkedin className="text-colorCaption text-xl hover:opacity-40 hover:scale-95" />
        </a>
        <a
          rel="noreferrer"
          href="https://www.instagram.com/fixtergeek/"
          target="_blank"
        >
          <AiFillInstagram className="text-colorCaption text-2xl hover:opacity-40 hover:scale-95" />
        </a>
        <a
          rel="noreferrer"
          href="https://www.youtube.com/channel/UC2cNZUym14-K-yGgOEAFh6g"
          target="_blank"
        >
          <FaYoutube className="text-colorCaption text-2xl hover:opacity-40 hover:scale-95" />
        </a>
      </div>
      {/* <div className="flex justify-center gap-4 py-4">
        <Link to="/aviso">
          <span className="text-gray-400 hover:text-gray-300 hover:underline">
            <p>Aviso de Privacidad</p>
          </span>
        </Link>
        <Link to="/politicas">
          <span className="text-gray-400 hover:text-gray-300 hover:underline">
            <p>Términos y condiciones</p>
          </span>
        </Link>
      </div> */}
      <p className="text-center text-gray-300 text-sm opacity-40 font-light mt-4">
        © 2016 - 2023 Fixtergeek
      </p>
    </section>
  );
}
