import { useState } from "react";

interface CountryCode {
  code: string;
  country: string;
  flag: string;
}

const countryCodes: CountryCode[] = [
  { code: "+52", country: "México", flag: "🇲🇽" },
  { code: "+1", country: "Estados Unidos", flag: "🇺🇸" },
  { code: "+1", country: "Canadá", flag: "🇨🇦" },
  { code: "+34", country: "España", flag: "🇪🇸" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+57", country: "Colombia", flag: "🇨🇴" },
  { code: "+51", country: "Perú", flag: "🇵🇪" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+58", country: "Venezuela", flag: "🇻🇪" },
  { code: "+593", country: "Ecuador", flag: "🇪🇨" },
];

interface PhoneInputProps {
  value?: string;
  onChange?: (fullNumber: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  name?: string;
  dark?: boolean;
}

export function PhoneInput({
  value = "",
  onChange,
  className = "",
  placeholder = "Número de teléfono",
  required = false,
  name = "phone",
  dark = false,
}: PhoneInputProps) {
  const [countryCode, setCountryCode] = useState("+52");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Parsear el valor inicial si viene completo
  if (value && !phoneNumber) {
    const foundCode = countryCodes.find(cc => value.startsWith(cc.code));
    if (foundCode) {
      setCountryCode(foundCode.code);
      setPhoneNumber(value.replace(foundCode.code, "").trim());
    }
  }

  const handleCountryChange = (newCode: string) => {
    setCountryCode(newCode);
    const fullNumber = newCode + phoneNumber.replace(/\s/g, "");
    onChange?.(fullNumber);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value.replace(/\D/g, ""); // Solo números

    // Formatear según el país - usando formato estándar 3-3-4
    if (countryCode === "+52") {
      // México: 10 dígitos (555 123 4567)
      if (inputValue.length > 10) inputValue = inputValue.slice(0, 10);
      if (inputValue.length > 6) {
        inputValue = inputValue.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
      } else if (inputValue.length > 3) {
        inputValue = inputValue.replace(/(\d{3})(\d{3})/, "$1 $2");
      }
    } else if (countryCode === "+1") {
      // USA/Canadá: 10 dígitos (555 123 4567)
      if (inputValue.length > 10) inputValue = inputValue.slice(0, 10);
      if (inputValue.length > 6) {
        inputValue = inputValue.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
      } else if (inputValue.length > 3) {
        inputValue = inputValue.replace(/(\d{3})(\d{3})/, "$1 $2");
      }
    } else {
      // Otros países: formato genérico 3-3-4 o similar
      if (inputValue.length > 12) inputValue = inputValue.slice(0, 12);
      if (inputValue.length > 6) {
        inputValue = inputValue.replace(/(\d{3})(\d{3})(\d{1,6})/, "$1 $2 $3");
      } else if (inputValue.length > 3) {
        inputValue = inputValue.replace(/(\d{3})(\d{1,3})/, "$1 $2");
      }
    }

    setPhoneNumber(inputValue);
    const fullNumber = countryCode + inputValue.replace(/\s/g, "");
    onChange?.(fullNumber);
  };

  const baseSelectClasses = dark
    ? "w-24 px-3 py-3 bg-white/10 border border-white/20 rounded-l-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#74DCF4] focus:border-transparent backdrop-blur-sm transition-colors"
    : "w-24 px-3 py-3 border border-gray-300 rounded-l-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  const baseInputClasses = dark
    ? "flex-1 px-4 py-3 bg-white/10 border border-l-0 border-white/20 rounded-r-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#74DCF4] focus:border-transparent transition-colors backdrop-blur-sm"
    : "flex-1 px-4 py-3 border border-l-0 border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <div className={`relative ${className}`}>
      <div className="flex">
        {/* Selector de código de país */}
        <select
          value={countryCode}
          onChange={(e) => handleCountryChange(e.target.value)}
          className={baseSelectClasses}
          style={dark ? { colorScheme: 'dark' } : {}}
        >
          {countryCodes.map((country) => (
            <option
              key={`${country.code}-${country.country}`}
              value={country.code}
              className={dark ? "bg-slate-800 text-white" : ""}
            >
              {country.flag} {country.code}
            </option>
          ))}
        </select>

        {/* Input del número */}
        <input
          type="tel"
          name={name}
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          required={required}
          className={baseInputClasses}
        />
      </div>

      {/* Input oculto para enviar el número completo */}
      <input
        type="hidden"
        name={`${name}_full`}
        value={countryCode + phoneNumber.replace(/\s/g, "")}
      />
    </div>
  );
}