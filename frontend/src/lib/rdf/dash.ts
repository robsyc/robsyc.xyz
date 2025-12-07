/**
 * DASH Vocabulary Support
 * 
 * DASH (Data Shapes Application Profile) extends SHACL with UI-specific metadata
 * for form generation, viewers, editors, and layout hints.
 * 
 * @see https://datashapes.org/dash
 * @see https://www.w3.org/community/shacl/
 * 
 * Key concepts we use:
 * - dash:viewer - Specifies how to display a property value
 * - dash:editor - Specifies how to edit a property value (future)
 * - dash:hidden - Marks a property as hidden from the UI
 * - dash:readOnly - Marks a property as read-only
 * - dash:neverMaterialize - For computed/derived properties
 * 
 * Custom rxyz: extensions for SvelteFlow visualization:
 * - rxyz:nodeType - Maps a shape to a SvelteFlow node component
 * - rxyz:isVisualized - Whether instances should appear as flow nodes
 * - rxyz:layoutHint - Layout hints (horizontal, vertical, cluster)
 * 
 * TODO: this file should be cleaned up and renamed to shacl-ui.ts
 * We should seek to define utilities for working with SHACL-UI hints and converting them to shadcn components.
 * Using the new SHACL1.2-ready spec instead of DASH.
 */

import { ns } from './clownface-store';
import type { GraphPointer } from 'clownface';
import type { NamedNode, Term } from '@rdfjs/types';
import type { Store } from 'n3';
import { getLocalName } from './utils';

/****************************************************************************************
 * DASH Vocabulary Constants
 * 
 * Standard DASH vocabulary terms for UI generation
 */
export const DASH = {
    // Viewers - how to display a value
    viewer: ns.dash('viewer'),
    LabelViewer: ns.dash('LabelViewer'),
    LiteralViewer: ns.dash('LiteralViewer'),
    URIViewer: ns.dash('URIViewer'),
    ImageViewer: ns.dash('ImageViewer'),
    HTMLViewer: ns.dash('HTMLViewer'),
    DateViewer: ns.dash('DateViewer'),
    DateTimeViewer: ns.dash('DateTimeViewer'),
    BooleanViewer: ns.dash('BooleanViewer'),
    
    // Editors - how to edit a value (future use)
    editor: ns.dash('editor'),
    TextFieldEditor: ns.dash('TextFieldEditor'),
    TextAreaEditor: ns.dash('TextAreaEditor'),
    RichTextEditor: ns.dash('RichTextEditor'),
    DatePickerEditor: ns.dash('DatePickerEditor'),
    BooleanEditor: ns.dash('BooleanEditor'),
    URIEditor: ns.dash('URIEditor'),
    AutoCompleteEditor: ns.dash('AutoCompleteEditor'),
    
    // Property metadata
    hidden: ns.dash('hidden'),
    readOnly: ns.dash('readOnly'),
    neverMaterialize: ns.dash('neverMaterialize'),
    reifiableBy: ns.dash('reifiableBy'),
    
    // Shape metadata
    applicableToClass: ns.dash('applicableToClass'),
    abstract: ns.dash('abstract'),
    
    // UI hints
    singleLine: ns.dash('singleLine'),
    
    // Root class check
    rootClass: ns.dash('rootClass'),
} as const;

/****************************************************************************************
 * Custom rxyz: Visualization Vocabulary
 * 
 * Extensions for SvelteFlow node visualization
 */
export const RXYZ_VIZ = {
    // Node type mapping
    nodeType: ns.rxyz('nodeType'),
    
    // Whether a shape's instances should be visualized as flow nodes
    isVisualized: ns.rxyz('isVisualized'),
    
    // Layout hints
    layoutHint: ns.rxyz('layoutHint'),
    LayoutHorizontal: ns.rxyz('LayoutHorizontal'),
    LayoutVertical: ns.rxyz('LayoutVertical'),
    LayoutCluster: ns.rxyz('LayoutCluster'),
    
    // Component hints
    componentName: ns.rxyz('componentName'),
    
    // Position properties (already exist in namespaces.ts)
    x: ns.rxyz('x'),
    y: ns.rxyz('y'),
    
    // Edge styling hints
    edgeType: ns.rxyz('edgeType'),
    edgeLabel: ns.rxyz('edgeLabel'),
} as const;

/****************************************************************************************
 * DASH Property Utilities
 */

/**
 * Check if a property shape should be hidden from the UI
 */
export function isHidden(propertyShape: GraphPointer<Term, Store>): boolean {
    const hidden = propertyShape.out(DASH.hidden).value;
    return hidden === 'true';
}

/**
 * Check if a property shape is read-only
 */
export function isReadOnly(propertyShape: GraphPointer<Term, Store>): boolean {
    const readOnly = propertyShape.out(DASH.readOnly).value;
    return readOnly === 'true';
}

/**
 * Get the DASH viewer for a property shape
 */
export function getViewer(propertyShape: GraphPointer<Term, Store>): string | undefined {
    return propertyShape.out(DASH.viewer).value;
}

/**
 * Get the DASH editor for a property shape (future use)
 */
export function getEditor(propertyShape: GraphPointer<Term, Store>): string | undefined {
    return propertyShape.out(DASH.editor).value;
}

/****************************************************************************************
 * rxyz: Visualization Utilities
 */

/**
 * Check if a shape's instances should be visualized as flow nodes
 */
export function shouldVisualize(shapePointer: GraphPointer<Term, Store>): boolean {
    const viz = shapePointer.out(RXYZ_VIZ.isVisualized).value;
    // Default to true if not specified
    return viz !== 'false';
}

/**
 * Get the SvelteFlow node type for a shape
 * Falls back to determining from target class/node if not specified
 */
export function getNodeType(shapePointer: GraphPointer<Term, Store>): string {
    // First check for explicit rxyz:nodeType
    const explicit = shapePointer.out(RXYZ_VIZ.nodeType).value;
    if (explicit) return explicit;
    
    // Check for rxyz:componentName
    const component = shapePointer.out(RXYZ_VIZ.componentName).value;
    if (component) return component;
    
    // Fall back to target-based inference
    const targetClass = shapePointer.out(ns.sh('targetClass')).value;
    const targetNode = shapePointer.out(ns.sh('targetNode')).value;
    
    const target = targetClass || targetNode;
    if (!target) return 'shape';
    
    return getLocalName(target).toLowerCase();
}

/**
 * Get layout hint for a shape
 */
export function getLayoutHint(shapePointer: GraphPointer<Term, Store>): 'horizontal' | 'vertical' | 'cluster' | undefined {
    const hint = shapePointer.out(RXYZ_VIZ.layoutHint).value;
    if (!hint) return undefined;
    
    const localName = getLocalName(hint);
    switch (localName) {
        case 'LayoutHorizontal': return 'horizontal';
        case 'LayoutVertical': return 'vertical';
        case 'LayoutCluster': return 'cluster';
        default: return undefined;
    }
}

/****************************************************************************************
 * Viewer Selection Helper
 * 
 * Determines the appropriate viewer based on property shape constraints
 */

/**
 * Automatically select the best viewer for a property based on its constraints
 */
export function selectViewer(propertyShape: GraphPointer<Term, Store>): string {
    // First check for explicit dash:viewer
    const explicit = getViewer(propertyShape);
    if (explicit) return getLocalName(explicit);
    
    // Check datatype
    const datatype = propertyShape.out(ns.sh('datatype')).value;
    if (datatype) {
        const dtLocal = getLocalName(datatype);
        switch (dtLocal) {
            case 'boolean': return 'BooleanViewer';
            case 'date': return 'DateViewer';
            case 'dateTime': return 'DateTimeViewer';
            case 'anyURI': return 'URIViewer';
            case 'string':
            default:
                // Check if it might be HTML or long text
                const pathLocal = getLocalName(propertyShape.out(ns.sh('path')).value ?? '');
                if (pathLocal.toLowerCase().includes('html') || 
                    pathLocal.toLowerCase().includes('body') ||
                    pathLocal.toLowerCase().includes('content')) {
                    return 'HTMLViewer';
                }
                return 'LiteralViewer';
        }
    }
    
    // Check for nodeKind (IRI = URIViewer)
    const nodeKind = propertyShape.out(ns.sh('nodeKind')).value;
    if (nodeKind?.includes('IRI')) {
        // Check if it's an image
        const pathLocal = getLocalName(propertyShape.out(ns.sh('path')).value ?? '');
        if (pathLocal.toLowerCase().includes('image') ||
            pathLocal.toLowerCase().includes('logo') ||
            pathLocal.toLowerCase().includes('avatar')) {
            return 'ImageViewer';
        }
        return 'URIViewer';
    }
    
    // Default
    return 'LabelViewer';
}

/****************************************************************************************
 * Example DASH-Annotated Shape
 * 
 * This is how a shape would look with DASH and rxyz: visualization hints:
 * 
 * ```turtle
 * rxyz:BlogPostingShape a sh:NodeShape ;
 *     sh:targetClass schema:BlogPosting ;
 *     rdfs:label "Blog Post" ;
 *     
 *     # rxyz: visualization hints
 *     rxyz:isVisualized true ;
 *     rxyz:nodeType "blog" ;
 *     rxyz:layoutHint rxyz:LayoutVertical ;
 *     
 *     sh:property [
 *         sh:path schema:headline ;
 *         sh:datatype xsd:string ;
 *         sh:minCount 1 ;
 *         sh:maxCount 1 ;
 *         
 *         # DASH viewer hint
 *         dash:viewer dash:LabelViewer ;
 *         
 *         # Property is required and not editable inline
 *         dash:readOnly true ;
 *     ] ;
 *     
 *     sh:property [
 *         sh:path schema:image ;
 *         sh:nodeKind sh:IRI ;
 *         
 *         # Use image viewer
 *         dash:viewer dash:ImageViewer ;
 *     ] ;
 *     
 *     sh:property [
 *         sh:path schema:articleBody ;
 *         sh:datatype xsd:string ;
 *         
 *         # Use HTML viewer for rich content
 *         dash:viewer dash:HTMLViewer ;
 *         dash:editor dash:RichTextEditor ;
 *     ] ;
 *     
 *     sh:property [
 *         sh:path rxyz:x ;
 *         sh:datatype xsd:integer ;
 *         
 *         # Hide position from UI
 *         dash:hidden true ;
 *     ] ;
 * .
 * ```
 */

