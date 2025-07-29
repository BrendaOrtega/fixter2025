import { Effect } from "effect";
// Error types
export class TextCleaningError extends Error {
    code;
    stage;
    constructor(message, code, stage) {
        super(message);
        this.code = code;
        this.stage = stage;
        this.name = "TextCleaningError";
    }
}
// Spanish number conversion maps
const CARDINAL_NUMBERS = new Map([
    [0, "cero"],
    [1, "uno"],
    [2, "dos"],
    [3, "tres"],
    [4, "cuatro"],
    [5, "cinco"],
    [6, "seis"],
    [7, "siete"],
    [8, "ocho"],
    [9, "nueve"],
    [10, "diez"],
    [11, "once"],
    [12, "doce"],
    [13, "trece"],
    [14, "catorce"],
    [15, "quince"],
    [16, "dieciséis"],
    [17, "diecisiete"],
    [18, "dieciocho"],
    [19, "diecinueve"],
    [20, "veinte"],
    [21, "veintiuno"],
    [22, "veintidós"],
    [23, "veintitrés"],
    [24, "veinticuatro"],
    [25, "veinticinco"],
    [26, "veintiséis"],
    [27, "veintisiete"],
    [28, "veintiocho"],
    [29, "veintinueve"],
    [30, "treinta"],
    [40, "cuarenta"],
    [50, "cincuenta"],
    [60, "sesenta"],
    [70, "setenta"],
    [80, "ochenta"],
    [90, "noventa"],
    [100, "cien"],
    [200, "doscientos"],
    [300, "trescientos"],
    [400, "cuatrocientos"],
    [500, "quinientos"],
    [600, "seiscientos"],
    [700, "setecientos"],
    [800, "ochocientos"],
    [900, "novecientos"],
    [1000, "mil"],
]);
const ORDINAL_NUMBERS = new Map([
    [1, "primero"],
    [2, "segundo"],
    [3, "tercero"],
    [4, "cuarto"],
    [5, "quinto"],
    [6, "sexto"],
    [7, "séptimo"],
    [8, "octavo"],
    [9, "noveno"],
    [10, "décimo"],
]);
// Spanish abbreviations
const ABBREVIATIONS = new Map([
    ["Dr.", "Doctor"],
    ["Dra.", "Doctora"],
    ["Sr.", "Señor"],
    ["Sra.", "Señora"],
    ["Srta.", "Señorita"],
    ["Prof.", "Profesor"],
    ["Profa.", "Profesora"],
    ["Ing.", "Ingeniero"],
    ["Lic.", "Licenciado"],
    ["etc.", "etcétera"],
    ["S.A.", "Sociedad Anónima"],
    ["Ltda.", "Limitada"],
    ["Cía.", "Compañía"],
    ["Av.", "Avenida"],
    ["C/", "Calle"],
    ["Pza.", "Plaza"],
    ["Dpto.", "Departamento"],
]);
// Month names for date conversion
const MONTHS = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
];
// Convert number to Spanish words
const convertNumberToSpanish = (num) => {
    if (num === 0)
        return "cero";
    if (num < 0)
        return `menos ${convertNumberToSpanish(-num)}`;
    if (CARDINAL_NUMBERS.has(num)) {
        return CARDINAL_NUMBERS.get(num);
    }
    if (num < 100) {
        const tens = Math.floor(num / 10) * 10;
        const units = num % 10;
        if (units === 0)
            return CARDINAL_NUMBERS.get(tens);
        return `${CARDINAL_NUMBERS.get(tens)} y ${CARDINAL_NUMBERS.get(units)}`;
    }
    if (num < 1000) {
        const hundreds = Math.floor(num / 100) * 100;
        const remainder = num % 100;
        if (remainder === 0)
            return CARDINAL_NUMBERS.get(hundreds);
        return `${CARDINAL_NUMBERS.get(hundreds)} ${convertNumberToSpanish(remainder)}`;
    }
    if (num < 1000000) {
        const thousands = Math.floor(num / 1000);
        const remainder = num % 1000;
        const thousandsText = thousands === 1 ? "mil" : `${convertNumberToSpanish(thousands)} mil`;
        if (remainder === 0)
            return thousandsText;
        return `${thousandsText} ${convertNumberToSpanish(remainder)}`;
    }
    // For larger numbers, return as is for now
    return num.toString();
};
// Remove code blocks but preserve inline code
const cleanCodeContent = (text) => Effect.try({
    try: () => {
        // Remove triple backtick code blocks
        let cleaned = text.replace(/```[\s\S]*?```/g, "");
        // Remove indented code blocks (4+ spaces)
        cleaned = cleaned.replace(/^[ \t]{4,}.*$/gm, "");
        // Preserve inline code content (remove backticks but keep content)
        cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
        return cleaned;
    },
    catch: (error) => new TextCleaningError(`Code cleaning failed: ${error}`, "CODE_CLEANING_FAILED", "PRE_PROCESSING"),
});
// Clean markdown formatting
const cleanMarkdown = (text) => Effect.try({
    try: () => {
        let cleaned = text;
        // Remove headers but keep text
        cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");
        cleaned = cleaned.replace(/#{1,6}\s+/g, ""); // Headers in middle of text
        // Remove bold/italic formatting but keep text
        cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1"); // **bold**
        cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1"); // *italic*
        cleaned = cleaned.replace(/__([^_]+)__/g, "$1"); // __bold__
        cleaned = cleaned.replace(/_([^_]+)_/g, "$1"); // _italic_
        // Remove strikethrough but keep text
        cleaned = cleaned.replace(/~~([^~]+)~~/g, "$1");
        // Remove links but keep text
        cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
        // Remove images completely
        cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, "");
        // Remove HTML tags but keep content
        cleaned = cleaned.replace(/<[^>]*>/g, "");
        // Remove blockquotes
        cleaned = cleaned.replace(/^>\s*/gm, "");
        // Remove list markers
        cleaned = cleaned.replace(/^[-*+]\s+/gm, "");
        cleaned = cleaned.replace(/^\d+\.\s+/gm, "");
        // Remove horizontal rules
        cleaned = cleaned.replace(/^[-*_]{3,}$/gm, "");
        // Remove remaining underscores that might be formatting artifacts
        cleaned = cleaned.replace(/_{2,}/g, " "); // Multiple underscores
        cleaned = cleaned.replace(/\b_+\b/g, " "); // Standalone underscores
        cleaned = cleaned.replace(/(\w)_+(\w)/g, "$1 $2"); // Underscores between words
        // Remove table formatting
        cleaned = cleaned.replace(/\|/g, " "); // Table separators
        // Remove footnote references
        cleaned = cleaned.replace(/\[\^[^\]]+\]/g, "");
        // Remove reference-style links
        cleaned = cleaned.replace(/^\[[^\]]+\]:\s*.+$/gm, "");
        return cleaned;
    },
    catch: (error) => new TextCleaningError(`Markdown cleaning failed: ${error}`, "MARKDOWN_CLEANING_FAILED", "PRE_PROCESSING"),
});
// Convert Spanish numbers
const convertNumbers = (text) => Effect.try({
    try: () => {
        let result = text;
        // Convert integers with commas (1,234)
        result = result.replace(/\b\d{1,3}(?:,\d{3})+\b/g, (match) => {
            const num = parseInt(match.replace(/,/g, ""));
            return convertNumberToSpanish(num);
        });
        // Convert simple integers
        result = result.replace(/\b\d+\b/g, (match) => {
            const num = parseInt(match);
            if (num >= 0 && num <= 999999) {
                return convertNumberToSpanish(num);
            }
            return match;
        });
        // Convert ordinals (1º, 2ª)
        result = result.replace(/\b(\d+)[ºª]\b/g, (match, numStr) => {
            const num = parseInt(numStr);
            return ORDINAL_NUMBERS.get(num) || `${convertNumberToSpanish(num)}º`;
        });
        // Convert percentages
        result = result.replace(/\b(\d+(?:\.\d+)?)%\b/g, (match, numStr) => {
            const num = parseFloat(numStr);
            return `${convertNumberToSpanish(Math.floor(num))} por ciento`;
        });
        return result;
    },
    catch: (error) => new TextCleaningError(`Number conversion failed: ${error}`, "NUMBER_CONVERSION_FAILED", "NORMALIZATION"),
});
// Expand abbreviations
const expandAbbreviations = (text) => Effect.try({
    try: () => {
        let result = text;
        for (const [abbrev, expansion] of ABBREVIATIONS) {
            const regex = new RegExp(`\\b${abbrev.replace(/\./g, "\\.")}`, "g");
            result = result.replace(regex, expansion);
        }
        return result;
    },
    catch: (error) => new TextCleaningError(`Abbreviation expansion failed: ${error}`, "ABBREVIATION_EXPANSION_FAILED", "NORMALIZATION"),
});
// Convert dates (15/03/2024 → "quince de marzo de dos mil veinticuatro")
const convertDates = (text) => Effect.try({
    try: () => {
        return text.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g, (match, day, month, year) => {
            const dayNum = parseInt(day);
            const monthNum = parseInt(month) - 1; // Convert to 0-indexed
            const yearNum = parseInt(year);
            if (monthNum >= 0 && monthNum < 12) {
                const dayText = convertNumberToSpanish(dayNum);
                const monthText = MONTHS[monthNum];
                const yearText = convertNumberToSpanish(yearNum);
                return `${dayText} de ${monthText} de ${yearText}`;
            }
            return match;
        });
    },
    catch: (error) => new TextCleaningError(`Date conversion failed: ${error}`, "DATE_CONVERSION_FAILED", "NORMALIZATION"),
});
// Remove URLs and emails
const removeDigitalContent = (text) => Effect.try({
    try: () => {
        let cleaned = text;
        // Remove URLs
        cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, "");
        cleaned = cleaned.replace(/www\.[^\s]+/g, "");
        // Remove email addresses
        cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "");
        // Remove social media handles
        cleaned = cleaned.replace(/@\w+/g, "");
        cleaned = cleaned.replace(/#\w+/g, "");
        return cleaned;
    },
    catch: (error) => new TextCleaningError(`Digital content removal failed: ${error}`, "DIGITAL_CONTENT_REMOVAL_FAILED", "PRE_PROCESSING"),
});
// Normalize punctuation according to RAE rules
const normalizePunctuation = (text) => Effect.try({
    try: () => {
        let normalized = text;
        // Spanish quotation marks
        normalized = normalized.replace(/"([^"]+)"/g, "«$1»");
        // Proper spacing around punctuation
        normalized = normalized.replace(/\s*([.,;:!?])\s*/g, "$1 ");
        // Ellipsis normalization
        normalized = normalized.replace(/\.{3,}/g, "…");
        // Em-dash handling
        normalized = normalized.replace(/--/g, "—");
        normalized = normalized.replace(/\s*—\s*/g, " — ");
        // Clean up multiple spaces
        normalized = normalized.replace(/\s+/g, " ");
        return normalized.trim();
    },
    catch: (error) => new TextCleaningError(`Punctuation normalization failed: ${error}`, "PUNCTUATION_NORMALIZATION_FAILED", "POST_PROCESSING"),
});
// Main text cleaning function
export const cleanTextForTTS = (text) => Effect.gen(function* () {
    // Pipeline: each stage processes the text sequentially
    const afterCodeCleaning = yield* cleanCodeContent(text);
    const afterMarkdownCleaning = yield* cleanMarkdown(afterCodeCleaning);
    const afterDigitalRemoval = yield* removeDigitalContent(afterMarkdownCleaning);
    const afterAbbreviations = yield* expandAbbreviations(afterDigitalRemoval);
    const afterDates = yield* convertDates(afterAbbreviations);
    const afterNumbers = yield* convertNumbers(afterDates);
    const final = yield* normalizePunctuation(afterNumbers);
    return final;
});
// Utility function for standalone number conversion
export const convertSpanishNumber = (num) => convertNumberToSpanish(num);
// Utility function for standalone abbreviation expansion
export const expandSpanishAbbreviation = (abbrev) => ABBREVIATIONS.get(abbrev) || abbrev;
