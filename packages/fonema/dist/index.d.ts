import { Effect } from "effect";
export declare class TextCleaningError extends Error {
    readonly code: string;
    readonly stage: string;
    constructor(message: string, code: string, stage: string);
}
export declare const cleanTextForTTS: (text: string) => Effect.Effect<string, TextCleaningError>;
export declare const convertSpanishNumber: (num: number) => string;
export declare const expandSpanishAbbreviation: (abbrev: string) => string;
export declare const convertEmojiToSpanish: (emoji: string) => string;
