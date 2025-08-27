export const useReadingTime = (text: string, capitalized: boolean) => {
  // util @todo move from here
  function readingTime() {
    const wpm = 225; // palabras por minuto (muy por debajo de la media 😕)
    const words = text.trim().split(/\s+/).length;
    const time = Math.ceil(words / wpm);
    return capitalized
      ? `Lectura de ${time} min ·`
      : `lectura de ${time} min ·`;
  }
  return readingTime();
};
