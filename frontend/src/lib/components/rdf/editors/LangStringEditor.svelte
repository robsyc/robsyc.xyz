<script lang="ts">
    import { Globe, Search } from '@lucide/svelte';
    import { Textarea } from '$lib/components/ui/textarea/index.js';
    import * as Popover from '$lib/components/ui/popover/index.js';
    import { Button } from '$lib/components/ui/button/index.js';
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
        /** Show inline preview */
        showPreview?: boolean;
    }

    let {
        value = $bindable(''),
        languageTag = $bindable('en'),
        onchange,
        placeholder = 'Enter text...',
        showPreview = false
    }: Props = $props();

    let langPopoverOpen = $state(false);
    let langSearch = $state('');

    // Filter languages by search
    const filteredLangs = $derived(
        langSearch.trim()
            ? LANGUAGE_TAGS.filter(l => 
                l.label.toLowerCase().includes(langSearch.toLowerCase()) ||
                l.tag.toLowerCase().includes(langSearch.toLowerCase()) ||
                l.nativeName.toLowerCase().includes(langSearch.toLowerCase())
            )
            : LANGUAGE_TAGS
    );

    // Current language info
    const currentLang = $derived(
        LANGUAGE_TAGS.find(l => l.tag === languageTag)
    );

    function handleValueInput(e: Event) {
        value = (e.target as HTMLTextAreaElement).value;
        onchange?.(value, languageTag);
    }

    function handleLangSelect(tag: string) {
        languageTag = tag;
        langPopoverOpen = false;
        langSearch = '';
        onchange?.(value, languageTag);
    }
</script>

<div class="flex flex-col gap-2">
    <!-- Text input with language indicator -->
    <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
            <span class="text-xs text-muted-foreground">Text</span>
            <!-- Language selector button -->
            <Popover.Root bind:open={langPopoverOpen}>
                <Popover.Trigger>
                    {#snippet child({ props })}
                        <Button
                            {...props}
                            variant="outline"
                            size="sm"
                            class="h-6 px-2 gap-1 text-xs font-mono"
                        >
                            <Globe class="h-3 w-3" />
                            {languageTag}
                            {#if currentLang}
                                <span class="text-muted-foreground font-normal">({currentLang.label})</span>
                            {/if}
                        </Button>
                    {/snippet}
                </Popover.Trigger>
                <Popover.Content class="w-64 p-2" align="end">
                    <div class="space-y-2">
                        <p class="text-xs font-medium text-muted-foreground">Language Tag</p>
                        <!-- Search input -->
                        <div class="relative">
                            <Search class="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search languages..."
                                class="w-full h-7 pl-7 pr-2 text-xs rounded border bg-background"
                                bind:value={langSearch}
                            />
                        </div>
                        <!-- Language list -->
                        <div class="max-h-48 overflow-auto space-y-0.5">
                            {#each filteredLangs as lang (lang.tag)}
                                <button
                                    type="button"
                                    class="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted/50 flex items-center justify-between"
                                    class:bg-muted={languageTag === lang.tag}
                                    onclick={() => handleLangSelect(lang.tag)}
                                >
                                    <span>{lang.label}</span>
                                    <span class="text-xs text-muted-foreground font-mono">{lang.tag}</span>
                                </button>
                            {:else}
                                <p class="text-xs text-muted-foreground text-center py-2">No matches</p>
                            {/each}
                        </div>
                    </div>
                </Popover.Content>
            </Popover.Root>
        </div>
        <Textarea
            {value}
            oninput={handleValueInput}
            {placeholder}
            class="min-h-[80px] text-sm"
        />
    </div>
    
    <!-- Optional preview -->
    {#if showPreview && value}
        <p class="text-xs text-muted-foreground font-mono">
            "{value}"@{languageTag}
        </p>
    {/if}
</div>
