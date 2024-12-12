import { Link } from "react-router";

export default function SimpleFooter() {
  return (
    <section className="mt-auto bg-brand-black-500 py-8 pb-20">
      <div className="flex justify-center gap-2">
        <a
          rel="noreferrer"
          href="https://www.facebook.com/fixterme"
          target="_blank"
        >
          <img className="w-8" src="/assets/face.png" alt="facebook icon" />
        </a>
        <a
          rel="noreferrer"
          href="https://twitter.com/FixterGeek"
          target="_blank"
        >
          <img className="w-8" src="/assets/twitter.png" alt="twitter icon" />
        </a>
        <a
          rel="noreferrer"
          href="https://www.linkedin.com/company/fixtergeek/"
          target="_blank"
        >
          <img className="w-8" src="/assets/in.png" alt="linkedin icon" />
        </a>
        <a
          rel="noreferrer"
          href="https://www.instagram.com/fixtergeek/"
          target="_blank"
        >
          <img className="w-8" src="/assets/insta.png" alt="instagram icon" />
        </a>
        <a
          rel="noreferrer"
          href="https://www.youtube.com/channel/UC2cNZUym14-K-yGgOEAFh6g"
          target="_blank"
        >
          <img className="w-8" src="/assets/youtube.png" alt="youtube icon" />
        </a>
      </div>
      <div className="flex justify-center gap-4 py-4">
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
      </div>
      <p className="text-center text-gray-300">© 2016 - 2023 Fixtergeek</p>
    </section>
  );
}
