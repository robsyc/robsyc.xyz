/**
 * RDF Datatype Configuration
 * 
 * Defines the XSD and RDF datatypes supported by the application,
 * along with editor component mappings for creating/editing RDF literals.
 * 
 * Based on RDF 1.1 Concepts: https://www.w3.org/TR/rdf11-concepts/#section-Datatypes
 * 
 * An RDF Literal consists of:
 * 1. Lexical form (Unicode string)
 * 2. Datatype IRI
 * 3. Language tag (if and only if datatype is rdf:langString)
 */

import { ns } from './namespaces';
import type { NamedNode } from 'n3';


/******************************************************************************
 * Language Tags
 * 
 * Common BCP47 language tags for language-tagged strings.
 * See: https://www.rfc-editor.org/info/bcp47
 *****************************************************************************/

export interface LanguageTag {
    /** BCP47 tag (e.g., "en", "en-US") */
    tag: string;
    /** Human-readable label */
    label: string;
    /** Native name of the language */
    nativeName: string;
}

export const LANGUAGE_TAGS: LanguageTag[] = [
    { tag: 'en', label: 'English', nativeName: 'English' },
    { tag: 'en-US', label: 'English (US)', nativeName: 'English (US)' },
    { tag: 'en-GB', label: 'English (UK)', nativeName: 'English (UK)' },
    { tag: 'nl', label: 'Dutch', nativeName: 'Nederlands' },
    { tag: 'nl-BE', label: 'Dutch (Belgium)', nativeName: 'Nederlands (België)' },
    { tag: 'de', label: 'German', nativeName: 'Deutsch' },
    { tag: 'de-AT', label: 'German (Austria)', nativeName: 'Deutsch (Österreich)' },
    { tag: 'fr', label: 'French', nativeName: 'Français' },
    { tag: 'fr-BE', label: 'French (Belgium)', nativeName: 'Français (Belgique)' },
    { tag: 'es', label: 'Spanish', nativeName: 'Español' },
    { tag: 'it', label: 'Italian', nativeName: 'Italiano' },
    { tag: 'pt', label: 'Portuguese', nativeName: 'Português' },
    { tag: 'ja', label: 'Japanese', nativeName: '日本語' },
    { tag: 'zh', label: 'Chinese', nativeName: '中文' },
    { tag: 'ko', label: 'Korean', nativeName: '한국어' },
];

/** Default language tag for new language-tagged strings */
export const DEFAULT_LANGUAGE_TAG = 'en';

/** Quick lookup set for valid language tags */
export const VALID_LANGUAGE_TAGS = new Set(LANGUAGE_TAGS.map(l => l.tag));


/******************************************************************************
 * Editor Types
 * 
 * Maps datatypes to UI editor components. These correspond to shadcn-svelte
 * components (existing or to be created).
 *****************************************************************************/

export type EditorType =
    // Text editors
    | 'text-input'           // Single-line text input (shadcn: Input) - https://www.shadcn-svelte.com/docs/components/input
    | 'textarea'             // Multi-line text (shadcn: Textarea) - https://www.shadcn-svelte.com/docs/components/textarea
    | 'lang-string'          // Text + language selector (custom: LangStringEditor)
    
    // Numeric editors
    | 'integer-input'        // Integer number field (shadcn-extras: NumberField) - https://www.shadcn-svelte-extras.com/components/number-field
    | 'decimal-input'        // Decimal number field (shadcn-extras: NumberField with decimals)
    | 'constrained-integer'  // Integer with min/max constraints (NumberField + validation)
    
    // Boolean
    | 'switch'             // Boolean toggle (shadcn: Checkbox or Switch) - https://www.shadcn-svelte.com/docs/components/switch
    
    // Date/Time editors
    | 'date-picker'          // Date only (shadcn: DatePicker or Calendar) - https://www.shadcn-svelte.com/docs/components/date-picker or https://www.shadcn-svelte-extras.com/components/nlp-date-input
    | 'time-picker'          // Time only (custom: TimePicker) - https://time.openstatus.dev/ or https://time.rdsx.dev/
    | 'datetime-picker'      // Date + Time (custom: DateTimePicker)
    | 'duration-input'       // ISO 8601 duration (custom: DurationEditor)
    
    // Special
    | 'iri-input';           // IRI/URI input with validation (custom: IriInput) should be valid URI but we should also support autocomplete based on labels of resources in the graph

/**
 * Editor component mapping (for future implementation)
 * 
 * TODO: Create these custom editor components:
 * - LangStringEditor: Input + Select for language tag
 * - NumberField: From shadcn-svelte-extras + configurable precision and range
 * - DatePicker: From shadcn-svelte
 * - TimePicker: Custom time input
 * - DateTimePicker: Combined date/time
 * - DurationEditor: ISO 8601 duration builder
 * - IriInput: URI input with validation and autocomplete
 */

/******************************************************************************
 * Datatype Categories
 *****************************************************************************/

export type DatatypeCategory = 
    | 'core'     // Fundamental types: string, boolean, numbers, langString, anyURI
    | 'datetime' // Date and time types
    | 'numeric'; // Integers with range constraints

export const DATATYPE_CATEGORIES: Record<DatatypeCategory, { label: string; order: number }> = {
    'core': { label: 'Core Types', order: 0 },
    'datetime': { label: 'Date & Time', order: 1 },
    'numeric': { label: 'Numeric', order: 2 },
};

/******************************************************************************
 * Datatype Definition
 *****************************************************************************/

export interface DatatypeInfo {
    key: string;                 // Unique key for this datatype
    iri: string;                 // The full IRI of the datatype
    node: NamedNode;             // RDF NamedNode for RDF operations
    label: string;               // Human-readable label
    description: string;         // Description of the value space
    category: DatatypeCategory;  // Category for UI grouping
    editorType: EditorType;      // Editor component type to use
    examples?: string[];         // Optional example lexical forms
    pattern?: RegExp;            // Optional validation pattern
    constraints?: {              // Optional constraints for numeric datatypes
        min?: number;
        max?: number;
        exclusiveMin?: boolean;
        exclusiveMax?: boolean;
    };
}

/******************************************************************************
 * Datatype Registry
 * based on: https://www.w3.org/TR/rdf11-concepts/#xsd-datatypes
 *****************************************************************************/

export const DATATYPES = {

    // =========================================================================
    // Core Types
    // =========================================================================
    
    string: {
        key: 'string',
        iri: ns.xsd('string').value,
        node: ns.xsd('string'),
        label: 'String',
        description: 'Plain text string (Unicode)',
        category: 'core',
        editorType: 'text-input',
        examples: ['Hello World', 'Some text value'],
    },
    
    langString: {
        key: 'langString',
        iri: ns.rdf('langString').value,
        node: ns.rdf('langString'),
        label: 'Language-tagged String',
        description: 'Text with a language tag (e.g., "hello"@en)',
        category: 'core',
        editorType: 'lang-string',
        examples: ['"Hello"@en', '"Bonjour"@fr', '"Hallo"@de'],
    },
    
    boolean: {
        key: 'boolean',
        iri: ns.xsd('boolean').value,
        node: ns.xsd('boolean'),
        label: 'Boolean',
        description: 'True or false value',
        category: 'core',
        editorType: 'switch',
        examples: ['true', 'false'],
        pattern: /^(true|false|1|0)$/,
    },
    
    integer: {
        key: 'integer',
        iri: ns.xsd('integer').value,
        node: ns.xsd('integer'),
        label: 'Integer',
        description: 'Whole number (arbitrary size)',
        category: 'core',
        editorType: 'integer-input',
        examples: ['42', '-100', '0'],
        pattern: /^[+-]?\d+$/,
    },
    
    decimal: {
        key: 'decimal',
        iri: ns.xsd('decimal').value,
        node: ns.xsd('decimal'),
        label: 'Decimal',
        description: 'Arbitrary-precision decimal number',
        category: 'core',
        editorType: 'decimal-input',
        examples: ['3.14159', '-42.0', '100.00'],
        pattern: /^[+-]?\d+(\.\d+)?$/,
    },
    
    anyURI: {
        key: 'anyURI',
        iri: ns.xsd('anyURI').value,
        node: ns.xsd('anyURI'),
        label: 'URI (as literal)',
        description: 'Absolute or relative URIs and IRIs',
        category: 'core',
        editorType: 'iri-input',
        examples: ['http://example.org/resource', 'urn:isbn:0451450523'],
    },

    // =========================================================================
    // Date & Time Types
    // =========================================================================
    
    // TODO: should verify the pattern with the ISO 8601 standard

    date: {
        key: 'date',
        iri: ns.xsd('date').value,
        node: ns.xsd('date'),
        label: 'Date',
        description: 'Calendar date (YYYY-MM-DD) with or without timezone',
        category: 'datetime',
        editorType: 'date-picker',
        examples: ['2024-12-17', '2024-12-17+01:00'],
        pattern: /^\d{4}-\d{2}-\d{2}(Z|[+-]\d{2}:\d{2})?$/,
    },
    
    time: {
        key: 'time',
        iri: ns.xsd('time').value,
        node: ns.xsd('time'),
        label: 'Time',
        description: 'Time of day (HH:MM:SS) with or without timezone',
        category: 'datetime',
        editorType: 'time-picker',
        examples: ['14:30:00', '14:30:00+02:00'],
        pattern: /^\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})?$/,
    },
    
    dateTime: {
        key: 'dateTime',
        iri: ns.xsd('dateTime').value,
        node: ns.xsd('dateTime'),
        label: 'DateTime',
        description: 'Date and time combined with or without timezone',
        category: 'datetime',
        editorType: 'datetime-picker',
        examples: ['2024-12-17T14:30:00', '2024-12-17T14:30:00+02:00'],
        pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})?$/,
    },
    
    dateTimeStamp: {
        key: 'dateTimeStamp',
        iri: ns.xsd('dateTimeStamp').value,
        node: ns.xsd('dateTimeStamp'),
        label: 'DateTime (with timezone)',
        description: 'Date and time with required timezone',
        category: 'datetime',
        editorType: 'datetime-picker',
        examples: ['2024-12-17T14:30:00Z', '2024-12-17T14:30:00+01:00'],
    },
    
    duration: {
        key: 'duration',
        iri: ns.xsd('duration').value,
        node: ns.xsd('duration'),
        label: 'Duration',
        description: 'Time duration (ISO 8601)',
        category: 'datetime',
        editorType: 'duration-input',
        examples: ['P1Y2M3DT4H5M6S', 'PT1H30M', 'P1D'],
        pattern: /^-?P(\d+Y)?(\d+M)?(\d+D)?(T(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/,
    },

    // =========================================================================
    // Numeric Types
    // =========================================================================

    float: {
        key: 'float',
        iri: ns.xsd('float').value,
        node: ns.xsd('float'),
        label: 'Float',
        description: '32-bit floating point numbers incl. ±Inf, ±0, NaN (IEEE 754)',
        category: 'numeric',
        editorType: 'decimal-input',
        examples: ['3.14', 'INF', 'NaN'],
    },
    
    double: {
        key: 'double',
        iri: ns.xsd('double').value,
        node: ns.xsd('double'),
        label: 'Double',
        description: '64-bit floating point numbers incl. ±Inf, ±0, NaN (IEEE 754)',
        category: 'numeric',
        editorType: 'decimal-input',
        examples: ['3.14159265358979', 'INF', 'NaN'],
    },
    
    positiveInteger: {
        key: 'positiveInteger',
        iri: ns.xsd('positiveInteger').value,
        node: ns.xsd('positiveInteger'),
        label: 'Positive Integer',
        description: 'Integer > 0',
        category: 'numeric',
        editorType: 'constrained-integer',
        examples: ['1', '42', '1000'],
        constraints: { min: 0, exclusiveMin: true },
    },
    
    nonNegativeInteger: {
        key: 'nonNegativeInteger',
        iri: ns.xsd('nonNegativeInteger').value,
        node: ns.xsd('nonNegativeInteger'),
        label: 'Non-Negative Integer',
        description: 'Integer ≥ 0',
        category: 'numeric',
        editorType: 'constrained-integer',
        examples: ['0', '42', '100'],
        constraints: { min: 0 },
    },
    
    negativeInteger: {
        key: 'negativeInteger',
        iri: ns.xsd('negativeInteger').value,
        node: ns.xsd('negativeInteger'),
        label: 'Negative Integer',
        description: 'Integer < 0',
        category: 'numeric',
        editorType: 'constrained-integer',
        examples: ['-1', '-42', '-1000'],
        constraints: { max: 0, exclusiveMax: true },
    },
    
    nonPositiveInteger: {
        key: 'nonPositiveInteger',
        iri: ns.xsd('nonPositiveInteger').value,
        node: ns.xsd('nonPositiveInteger'),
        label: 'Non-Positive Integer',
        description: 'Integer ≤ 0',
        category: 'numeric',
        editorType: 'constrained-integer',
        examples: ['0', '-42', '-100'],
        constraints: { max: 0 },
    },

} as const satisfies Record<string, DatatypeInfo>;

export type DatatypeKey = keyof typeof DATATYPES;

/******************************************************************************
 * Lookup Functions
 *****************************************************************************/

/** Map from IRI to datatype info for quick lookup */
const datatypeByIri = new Map<string, DatatypeInfo>(
    Object.values(DATATYPES).map(dt => [dt.iri, dt])
);

/** Get datatype info by IRI */
export function getDatatypeByIri(iri: string): DatatypeInfo | undefined {
    return datatypeByIri.get(iri);
}

/** Get datatype info by key */
export function getDatatypeByKey(key: DatatypeKey): DatatypeInfo {
    return DATATYPES[key];
}

/** All supported datatype IRIs */
export const SUPPORTED_DATATYPE_IRIS = new Set(Object.values(DATATYPES).map(dt => dt.iri));

/** Check if an IRI is a supported datatype */
export function isSupportedDatatype(iri: string): boolean {
    return SUPPORTED_DATATYPE_IRIS.has(iri);
}

/** Get all datatypes grouped by category (ordered) */
export function getDatatypesByCategory(): Array<{ category: DatatypeCategory; label: string; datatypes: DatatypeInfo[] }> {
    const grouped = new Map<DatatypeCategory, DatatypeInfo[]>();
    
    for (const dt of Object.values(DATATYPES)) {
        const existing = grouped.get(dt.category) ?? [];
        existing.push(dt);
        grouped.set(dt.category, existing);
    }
    
    // Return ordered by category order
    return Object.entries(DATATYPE_CATEGORIES)
        .sort(([, a], [, b]) => a.order - b.order)
        .map(([category, { label }]) => ({
            category: category as DatatypeCategory,
            label,
            datatypes: grouped.get(category as DatatypeCategory) ?? [],
        }));
}

/******************************************************************************
 * RDF Literal Value Types
 * 
 * These types represent the value being edited before it becomes an RDF literal.
 * Use these in your editor components.
 *****************************************************************************/

/** Value for a plain literal (most datatypes) */
export interface LiteralValue {
    kind: 'literal';
    /** The lexical form (string representation) */
    lexicalForm: string;
    /** The datatype IRI */
    datatypeIri: string;
}

/** Value for a language-tagged string */
export interface LangStringValue {
    kind: 'langString';
    /** The text content */
    lexicalForm: string;
    /** BCP47 language tag */
    languageTag: string;
    /** Always rdf:langString */
    datatypeIri: typeof DATATYPES.langString.iri;
}

/** Union type for all possible object values in a triple */
export type ObjectValue = LiteralValue | LangStringValue ;

/******************************************************************************
 * Factory Functions for Creating Values
 *****************************************************************************/

/** Create a plain literal value */
export function createLiteralValue(lexicalForm: string, datatypeKey: DatatypeKey): LiteralValue {
    return {
        kind: 'literal',
        lexicalForm,
        datatypeIri: DATATYPES[datatypeKey].iri,
    };
}

/** Create a language-tagged string value */
export function createLangStringValue(text: string, languageTag: string = DEFAULT_LANGUAGE_TAG): LangStringValue {
    return {
        kind: 'langString',
        lexicalForm: text,
        languageTag,
        datatypeIri: DATATYPES.langString.iri,
    };
}

/******************************************************************************
 * Validation Helpers
 *****************************************************************************/

/** Validate a lexical form against a datatype's pattern */
export function validateLexicalForm(lexicalForm: string, datatypeKey: DatatypeKey): boolean {
    const datatype = DATATYPES[datatypeKey] as DatatypeInfo;
    if (!datatype.pattern) return true;
    return datatype.pattern.test(lexicalForm);
}

/** Validate a constrained integer value */
export function validateConstrainedInteger(value: number, datatypeKey: DatatypeKey): boolean {
    const datatype = DATATYPES[datatypeKey] as DatatypeInfo;
    if (!datatype.constraints) return true;
    
    const { min, max, exclusiveMin, exclusiveMax } = datatype.constraints;
    
    if (min !== undefined) {
        if (exclusiveMin ? value <= min : value < min) return false;
    }
    if (max !== undefined) {
        if (exclusiveMax ? value >= max : value > max) return false;
    }
    
    return true;
}

/** Validate a language tag */
export function isValidLanguageTag(tag: string): boolean {
    // Basic BCP47 validation (simplified)
    // Full validation would use a proper BCP47 parser
    return /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/.test(tag);
}

/******************************************************************************
 * Example: How to use this in an editor component
 * 
 * ```svelte
 * <script lang="ts">
 *   import { 
 *     DATATYPES, 
 *     LANGUAGE_TAGS, 
 *     type ObjectValue,
 *     createLiteralValue,
 *     createLangStringValue,
 *     createIriReferenceValue,
 *     getDatatypeByKey,
 *   } from '$lib/rdf/datatypes';
 *   
 *   let selectedDatatype = $state<DatatypeKey>('string');
 *   let lexicalForm = $state('');
 *   let languageTag = $state('en');
 *   
 *   // Get editor type for selected datatype
 *   const editorType = $derived(getDatatypeByKey(selectedDatatype).editorType);
 *   
 *   // Build the final value
 *   function getValue(): ObjectValue {
 *     if (selectedDatatype === 'langString') {
 *       return createLangStringValue(lexicalForm, languageTag);
 *     }
 *     return createLiteralValue(lexicalForm, selectedDatatype);
 *   }
 * </script>
 * 
 * <!-- Datatype selector -->
 * <Select bind:value={selectedDatatype}>
 *   {#each Object.entries(DATATYPES) as [key, dt]}
 *     <SelectItem value={key}>{dt.label}</SelectItem>
 *   {/each}
 * </Select>
 * 
 * <!-- Dynamic editor based on editorType -->
 * {#if editorType === 'text-input'}
 *   <Input bind:value={lexicalForm} />
 * {:else if editorType === 'lang-string'}
 *   <Input bind:value={lexicalForm} />
 *   <Select bind:value={languageTag}>
 *     {#each LANGUAGE_TAGS as lang}
 *       <SelectItem value={lang.tag}>{lang.label}</SelectItem>
 *     {/each}
 *   </Select>
 * {:else if editorType === 'integer-input'}
 *   <NumberField bind:value={lexicalForm} />
 * {:else if editorType === 'checkbox'}
 *   <Checkbox checked={lexicalForm === 'true'} 
 *     onCheckedChange={(v) => lexicalForm = v ? 'true' : 'false'} />
 * {:else if editorType === 'date-picker'}
 *   <DatePicker bind:value={lexicalForm} />
 * {/if}
 * ```
 *****************************************************************************/
