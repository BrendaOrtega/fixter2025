import {
  cleanTextForTTS,
  convertSpanishNumber,
  expandSpanishAbbreviation,
} from "./dist/index.js";
import { Effect } from "effect";

// Comprehensive test
const testText = `
Dr. Juan tiene 25 años y vive en la Av. Principal 123. 
Su email es juan@test.com y su web es https://example.com. 
El 15/03/2024 cumplió 25 años y obtuvo el 1º lugar.
Tiene un 95% de aprobación y ganó $1,500.
\`\`\`
console.log("código");
\`\`\`
Pero el código \`inline\` se mantiene.
`;

console.log("=== COMPREHENSIVE TEST ===");
console.log("Original text:", testText);

const program = Effect.gen(function* () {
  const cleaned = yield* cleanTextForTTS(testText);
  console.log("\nCleaned text:", cleaned);

  console.log("\n=== UTILITY FUNCTIONS ===");
  console.log("Number 1234:", convertSpanishNumber(1234));
  console.log("Abbreviation 'Dr.':", expandSpanishAbbreviation("Dr."));
});

Effect.runSync(program);
