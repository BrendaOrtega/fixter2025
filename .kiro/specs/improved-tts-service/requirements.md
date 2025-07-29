# Requirements Document

## Introduction

Create "fonema" - ultra-minimal Spanish text cleaning library. 100% Effect-TS, single file, provider-agnostic, professional Spanish normalization.

## Requirements

### Requirement 1: Professional Spanish Text Normalization

**User Story:** As a developer using any TTS service, I want a professional-grade Spanish text normalization library so that I can clean text for any TTS provider (Google, ElevenLabs, etc.) or use it standalone for text processing.

#### Acceptance Criteria

1. WHEN processing Spanish text THEN the system SHALL apply Real Academia Española (RAE) punctuation and spacing rules
2. WHEN encountering numbers THEN the system SHALL convert them to proper Spanish cardinal/ordinal forms (e.g., "1,234" → "mil doscientos treinta y cuatro", "1º" → "primero")
3. WHEN processing dates THEN the system SHALL convert to natural Spanish format (e.g., "15/03/2024" → "quince de marzo de dos mil veinticuatro")
4. WHEN processing time expressions THEN the system SHALL normalize to Spanish format (e.g., "14:30" → "las dos y media de la tarde")
5. WHEN processing currency THEN the system SHALL expand to full Spanish forms (e.g., "$100" → "cien dólares", "€50" → "cincuenta euros")
6. WHEN processing percentages THEN the system SHALL expand properly (e.g., "25%" → "veinticinco por ciento")
7. WHEN processing measurements THEN the system SHALL expand units (e.g., "5km" → "cinco kilómetros", "100g" → "cien gramos")

### Requirement 2: Professional Abbreviation and Acronym Handling

**User Story:** As a user consuming technical or formal content, I want abbreviations and acronyms to be properly expanded so that the audio is clear and professional.

#### Acceptance Criteria

1. WHEN processing common Spanish abbreviations THEN the system SHALL expand them correctly (e.g., "Dr." → "Doctor", "Sra." → "Señora", "etc." → "etcétera")
2. WHEN processing titles and honorifics THEN the system SHALL expand appropriately (e.g., "Sr." → "Señor", "Ing." → "Ingeniero", "Lic." → "Licenciado")
3. WHEN processing business abbreviations THEN the system SHALL expand them (e.g., "S.A." → "Sociedad Anónima", "Ltda." → "Limitada")
4. WHEN processing technical acronyms THEN the system SHALL spell them letter by letter with proper Spanish pronunciation (e.g., "API" → "A-P-I", "URL" → "U-R-L")
5. WHEN processing well-known acronyms THEN the system SHALL use their Spanish pronunciation when applicable (e.g., "NASA" → "NASA", "FIFA" → "FIFA")
6. WHEN processing mixed-case acronyms THEN the system SHALL normalize them consistently

### Requirement 3: Intelligent Code and Technical Content Handling

**User Story:** As a developer or technical user, I want the system to intelligently handle code content so that inline code is preserved for pronunciation while large code blocks are appropriately removed.

#### Acceptance Criteria

1. WHEN processing inline code (single backticks) THEN the system SHALL preserve the content and pronounce it naturally
2. WHEN processing code blocks (triple backticks) THEN the system SHALL remove the entire block including content
3. WHEN processing indented code blocks THEN the system SHALL remove them completely
4. WHEN processing HTML/XML tags THEN the system SHALL remove tags but preserve inner text content
5. WHEN processing programming keywords in text THEN the system SHALL pronounce them in Spanish when context suggests they're part of narrative
6. WHEN processing file paths THEN the system SHALL either remove them or pronounce them naturally based on context
7. WHEN processing variable names in text THEN the system SHALL pronounce them as individual words when possible

### Requirement 4: Advanced Punctuation and Prosody Optimization

**User Story:** As a user, I want the TTS output to have natural pauses, intonation, and rhythm that matches professional Spanish speech patterns.

#### Acceptance Criteria

1. WHEN processing sentences THEN the system SHALL ensure proper spacing after punctuation marks according to Spanish typography rules
2. WHEN processing ellipsis THEN the system SHALL normalize them to create appropriate pauses (e.g., "..." → natural pause)
3. WHEN processing em-dashes and en-dashes THEN the system SHALL convert them to appropriate pauses or conjunctions
4. WHEN processing parenthetical expressions THEN the system SHALL add subtle pauses for natural flow
5. WHEN processing quotation marks THEN the system SHALL handle Spanish-style quotes (« ») and convert others appropriately
6. WHEN processing exclamation and question marks THEN the system SHALL preserve Spanish inverted marks when present and add them when missing for proper intonation
7. WHEN processing lists THEN the system SHALL add appropriate pauses and conjunctions for natural enumeration

### Requirement 5: Content Type Detection and Context-Aware Processing

**User Story:** As a user with diverse content types, I want the system to intelligently detect content context and apply appropriate cleaning strategies.

#### Acceptance Criteria

1. WHEN processing technical documentation THEN the system SHALL preserve technical terms while cleaning formatting
2. WHEN processing narrative text THEN the system SHALL optimize for natural storytelling flow
3. WHEN processing academic content THEN the system SHALL properly handle citations, footnotes, and references
4. WHEN processing social media content THEN the system SHALL handle hashtags, mentions, and emojis appropriately
5. WHEN processing mixed content THEN the system SHALL apply different strategies to different sections intelligently
6. WHEN processing mathematical expressions THEN the system SHALL convert them to spoken Spanish mathematical language

### Requirement 6: URL, Email, and Digital Content Sanitization

**User Story:** As a user, I want digital artifacts like URLs and email addresses to be handled professionally without disrupting the natural flow of speech.

#### Acceptance Criteria

1. WHEN processing URLs THEN the system SHALL remove them completely unless they're essential to context
2. WHEN processing email addresses THEN the system SHALL remove them completely
3. WHEN processing social media handles THEN the system SHALL remove @ symbols and # hashtags
4. WHEN processing file extensions THEN the system SHALL remove them unless contextually relevant
5. WHEN processing markdown links THEN the system SHALL preserve link text and remove URLs
6. WHEN processing image references THEN the system SHALL remove them completely including alt text

### Requirement 7: NPM Library Creation and Distribution

**User Story:** As a developer, I want to use a lightweight, zero-dependency NPM library for Spanish text cleaning so that I can easily integrate professional TTS text processing into any project.

#### Acceptance Criteria

1. WHEN creating the library THEN it SHALL be published as "fonema" NPM package
2. WHEN writing the library THEN it SHALL be implemented 100% in Effect-TS with minimal boilerplate
3. WHEN installing the library THEN it SHALL have only Effect as dependency (peer dependency)
4. WHEN using the library THEN it SHALL be completely provider-agnostic (works with any TTS service or standalone)
5. WHEN using the library THEN it SHALL provide both ES modules and CommonJS exports
6. WHEN importing the library THEN it SHALL have TypeScript definitions included
7. WHEN using the library THEN it SHALL be tree-shakeable for optimal bundle size
8. WHEN implementing functions THEN they SHALL follow Effect-TS patterns with zero unnecessary abstractions
9. WHEN documenting the library THEN it SHALL include examples for standalone use and TTS integration
10. WHEN implementing the library THEN it SHALL have zero testing infrastructure for maximum minimalism
