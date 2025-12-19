<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
    import { Eye } from '@lucide/svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Label } from '$lib/components/ui/label/index.js';
    import { Switch } from '$lib/components/ui/switch/index.js';
    import * as Dialog from '$lib/components/ui/dialog/index.js';
    import { getRdfContext } from '../context';
    import { HierarchyTree } from '../tree';
    import DatatypeSelector from './DatatypeSelector.svelte';
    import LangStringEditor from './LangStringEditor.svelte';
    import { addAnnotation, updateAnnotation, type AnnotationValue } from '$lib/rdf/queries';
    import { ns, toCompactIri } from '$lib/rdf/namespaces';
    import { 
        DATATYPES, getDatatypeByIri,
        type DatatypeKey, validateLexicalForm, validateConstrainedInteger 
    } from '$lib/rdf/datatypes';
    import { getSuggestedDatatype } from '$lib/rdf/datatype-hints';

    interface Props {
        open?: boolean;
        subject: NamedNode | BlankNode;
        predicate?: NamedNode;
        existingValue?: AnnotationValue;
        onsubmit?: () => void;
        onclose?: () => void;
    }

    let {
        open = $bindable(false),
        subject,
        predicate: initialPredicate,
        existingValue,
        onsubmit,
        onclose
    }: Props = $props();

    const ctx = getRdfContext();
    const store = ctx.store;

    // Infer datatype from existing value
    function inferDatatype(val?: AnnotationValue): DatatypeKey {
        if (!val) return 'string';
        if (val.language) return 'langString';
        if (val.datatype) {
            const dt = getDatatypeByIri(val.datatype);
            if (dt) return dt.key as DatatypeKey;
        }
        return 'string';
    }

    // Form state - initialized once, reset via effect when dialog opens
    let selectedPredicate = $state<NamedNode | BlankNode | null>(null);
    let selectedDatatype = $state<DatatypeKey>('string');
    let value = $state('');
    let languageTag = $state('en');
    
    // Sync form state when dialog opens with new props
    $effect(() => {
        if (open) {
            selectedPredicate = initialPredicate ?? (existingValue?.quad.predicate as NamedNode) ?? null;
            selectedDatatype = inferDatatype(existingValue);
            value = existingValue?.value ?? '';
            languageTag = existingValue?.language ?? 'en';
            showPreview = false;
        }
    });
    
    // UI state
    let showPreview = $state(false);

    // Validation
    const validationError = $derived.by(() => {
        const v = value;
        const dt = selectedDatatype;
        
        if (!v.trim()) return null;
        if (dt === 'langString') return null;
        
        const dtInfo = DATATYPES[dt];
        if (!validateLexicalForm(v, dt)) {
            return `Invalid ${dtInfo.label}. Example: ${dtInfo.examples?.[0] ?? ''}`;
        }
        if (dtInfo.editorType === 'constrained-integer') {
            const num = parseInt(v, 10);
            if (!validateConstrainedInteger(num, dt)) {
                return `Must be ${dtInfo.description.toLowerCase()}`;
            }
        }
        return null;
    });

    // Status message
    const statusMessage = $derived.by(() => {
        if (!selectedPredicate) return 'Select a property';
        if (!value.trim()) return 'Enter a value';
        if (validationError) return validationError;
        return null;
    });

    const isValid = $derived(!statusMessage);

    // Preview
    const preview = $derived.by(() => {
        if (!selectedPredicate) return '';
        const s = toCompactIri(subject.value);
        const p = toCompactIri(selectedPredicate.value);
        
        if (selectedDatatype === 'langString') {
            return `${s} ${p} "${value}"@${languageTag} .`;
        }
        const dt = DATATYPES[selectedDatatype];
        if (dt.iri === ns.xsd('string').value) {
            return `${s} ${p} "${value}" .`;
        }
        return `${s} ${p} "${value}"^^${toCompactIri(dt.iri)} .`;
    });

    function handleSubmit() {
        if (!isValid || !selectedPredicate) return;
        
        const options = selectedDatatype === 'langString'
            ? { language: languageTag }
            : { datatype: DATATYPES[selectedDatatype].node };
        
        if (existingValue) {
            // Edit mode: remove old quad and add new one
            updateAnnotation(store, existingValue.quad, value, options);
        } else {
            // Add mode
            addAnnotation(store, subject, selectedPredicate as NamedNode, value, options);
        }
        
        onsubmit?.();
        resetForm();
        open = false;
    }

    function handleClose() {
        resetForm();
        onclose?.();
        open = false;
    }

    function resetForm() {
        // State is reset via $effect when dialog reopens
        // This is kept for manual reset if needed
    }

    function handlePropertySelect(prop: NamedNode | BlankNode | null) {
        selectedPredicate = prop;
        // Auto-suggest datatype based on property (using hierarchy inheritance)
        if (prop && prop.termType === 'NamedNode') {
            const suggestedDatatype = getSuggestedDatatype(store, prop);
            if (suggestedDatatype) {
                selectedDatatype = suggestedDatatype;
            }
        }
    }
    
    function handleValueInput(e: Event) {
        value = (e.target as HTMLInputElement).value;
    }
</script>

<Dialog.Root bind:open onOpenChange={(o) => !o && handleClose()}>
    <Dialog.Content class="!max-w-[80vw] w-[80vw] h-[600px] flex flex-col">
        <Dialog.Header>
            <Dialog.Title>{existingValue ? 'Edit' : 'Add'} Annotation</Dialog.Title>
            <Dialog.Description>
                <span class="font-mono text-xs">{toCompactIri(subject.value)}</span>
            </Dialog.Description>
        </Dialog.Header>
        
        <div class="flex-1 grid grid-cols-3 gap-4 min-h-0 overflow-hidden">
            <!-- Property selector using shared HierarchyTree -->
            <HierarchyTree
                resourceType={ns.owl('AnnotationProperty')}
                hierarchyPredicate={ns.rdfs('subPropertyOf')}
                bind:selected={selectedPredicate}
                onselect={handlePropertySelect}
                typeBadge="owl:AnnotationProperty"
                showToolbar={false}
                compact
            />
            
            <!-- Datatype selector -->
            <DatatypeSelector bind:selected={selectedDatatype} />
            
            <!-- Value editor -->
            <div class="flex flex-col border rounded-lg overflow-hidden">
                <div class="p-2 border-b bg-muted/30 flex items-center justify-between shrink-0">
                    <span class="text-xs font-medium text-muted-foreground">Value</span>
                    <Button
                        variant={showPreview ? "secondary" : "ghost"}
                        size="icon"
                        class="h-6 w-6"
                        onclick={() => showPreview = !showPreview}
                    >
                        <Eye class="h-3.5 w-3.5" />
                    </Button>
                </div>
                <div class="flex-1 p-3 flex flex-col gap-3 overflow-auto">
                    <p class="text-xs text-muted-foreground">{DATATYPES[selectedDatatype].description}</p>
                    
                    {#if selectedDatatype === 'langString'}
                        <LangStringEditor bind:value bind:languageTag />
                    {:else if DATATYPES[selectedDatatype].editorType === 'switch'}
                        <div class="flex items-center gap-3">
                            <Switch
                                id="bool-value"
                                checked={value === 'true'}
                                onCheckedChange={(checked) => value = checked ? 'true' : 'false'}
                            />
                            <Label for="bool-value" class="font-mono">{value === 'true' ? 'true' : 'false'}</Label>
                        </div>
                    {:else if DATATYPES[selectedDatatype].editorType === 'integer-input' || DATATYPES[selectedDatatype].editorType === 'constrained-integer'}
                        <div class="flex flex-col gap-2">
                            <Label class="text-xs">Value</Label>
                            <input
                                type="number"
                                value={value}
                                oninput={handleValueInput}
                                step="1"
                                class="h-8 rounded-md border bg-background px-2 text-sm"
                            />
                        </div>
                    {:else if DATATYPES[selectedDatatype].editorType === 'decimal-input'}
                        <div class="flex flex-col gap-2">
                            <Label class="text-xs">Value</Label>
                            <input
                                type="number"
                                value={value}
                                oninput={handleValueInput}
                                step="any"
                                class="h-8 rounded-md border bg-background px-2 text-sm"
                            />
                        </div>
                    {:else}
                        <div class="flex flex-col gap-2">
                            <Label class="text-xs">Value</Label>
                            <input
                                type="text"
                                value={value}
                                oninput={handleValueInput}
                                placeholder="Enter value..."
                                class="h-8 rounded-md border bg-background px-2 text-sm"
                            />
                        </div>
                    {/if}
                    
                    {#if showPreview && selectedPredicate && value}
                        <div class="mt-auto pt-2 border-t">
                            <p class="text-xs text-muted-foreground mb-1">Preview:</p>
                            <code class="text-xs font-mono break-all bg-muted p-2 rounded block">{preview}</code>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
        
        <Dialog.Footer class="mt-3 flex items-center">
            {#if statusMessage}
                <p class="text-xs text-muted-foreground mr-auto">{statusMessage}</p>
            {/if}
            <div class="flex gap-2">
                <Button variant="outline" size="sm" onclick={handleClose}>Cancel</Button>
                <Button size="sm" onclick={handleSubmit} disabled={!isValid}>
                    {existingValue ? 'Update' : 'Add'}
                </Button>
            </div>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
