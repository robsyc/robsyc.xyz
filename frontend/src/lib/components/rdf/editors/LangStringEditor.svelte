<script lang="ts">
    import { Search } from '@lucide/svelte';
    import { Label } from '$lib/components/ui/label/index.js';
    import { Textarea } from '$lib/components/ui/textarea/index.js';
    import { LANGUAGE_TAGS } from '$lib/rdf/datatypes';

    interface Props {
        /** The text value */
        value?: string;
        /** The language tag */
        languageTag?: string;
        /** Callback when value changes */
        onchange?: (value: string, languageTag: string) => void;
        /** Placeholder text */
        placeholder?: string;
    }

    let {
        value = $bindable(''),
        languageTag = $bindable('en'),
        onchange,
        placeholder = 'Enter text...'
    }: Props = $props();

    let langSearch = $state('');

    // Language tags with search filtering
    const filteredLangs = $derived(
        langSearch.trim()
            ? LANGUAGE_TAGS.filter(l => 
                l.label.toLowerCase().includes(langSearch.toLowerCase()) ||
                l.tag.toLowerCase().includes(langSearch.toLowerCase()) ||
                l.nativeName.toLowerCase().includes(langSearch.toLowerCase())
            )
            : LANGUAGE_TAGS
    );

    function handleValueInput(e: Event) {
        value = (e.target as HTMLTextAreaElement).value;
        onchange?.(value, languageTag);
    }

    function handleLangSelect(tag: string) {
        languageTag = tag;
        onchange?.(value, languageTag);
    }
</script>

<div class="flex flex-col gap-3">
    <div class="flex flex-col gap-2">
        <Label class="text-xs">Text</Label>
        <Textarea
            {value}
            oninput={handleValueInput}
            {placeholder}
            class="min-h-[100px] text-sm"
        />
    </div>
    <div class="flex flex-col gap-2">
        <Label class="text-xs">Language</Label>
        <div class="relative">
            <Search class="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
                type="text"
                placeholder="Search languages..."
                class="w-full h-7 pl-7 pr-2 text-xs rounded border bg-background mb-1"
                bind:value={langSearch}
            />
        </div>
        <div class="max-h-32 overflow-auto border rounded">
            {#each filteredLangs as lang (lang.tag)}
                <button
                    type="button"
                    class="w-full text-left px-2 py-1 text-sm hover:bg-muted/50"
                    class:bg-muted={languageTag === lang.tag}
                    onclick={() => handleLangSelect(lang.tag)}
                >
                    {lang.label} <span class="text-muted-foreground">({lang.tag})</span>
                </button>
            {/each}
            {#if filteredLangs.length === 0}
                <p class="text-xs text-muted-foreground text-center py-2">No matches</p>
            {/if}
        </div>
    </div>
</div>


