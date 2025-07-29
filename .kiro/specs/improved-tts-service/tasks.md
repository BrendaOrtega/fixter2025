# Implementation Plan

- [ ] 1. Create "fonema" ultra-minimal library in `packages/fonema/`

  - Single index.ts file with all functionality
  - Package.json with Effect peer dependency only
  - ESM only build
  - _Requirements: All_

- [x] 2. Implement Spanish text cleaning in single Effect pipeline

  - Spanish number conversion (1,234 → "mil doscientos treinta y cuatro")
  - Abbreviation expansion (Dr. → "Doctor", etc. → "etcétera")
  - Date/time normalization (15/03/2024 → "quince de marzo...")
  - Code block removal (```) but preserve inline code (`)
  - URL/email removal
  - RAE-compliant punctuation normalization
  - _Requirements: All_

- [x] 3. Create minimal README with Effect examples

  - Standalone usage
  - TTS integration examples
  - _Requirements: Documentation_

- [x] 4. Publish fonema to NPM

  - Configure NPM publishing
  - Publish initial version
  - _Requirements: Distribution_

- [x] 5. Integrate into TTS service
  - Replace cleanTextForTTS with fonema
  - Test with Google Cloud TTS
  - Use the new library from npm cloud in fixtergeek2025 project
  - _Requirements: Integration_
