<script lang="ts">
    /**
     * InstancesDialog - Placeholder for Instance Management
     * Future: query/display/CRUD instances of the class/shape.
     */
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Database, Construction } from "@lucide/svelte";
    
    import type { GraphPointer } from 'clownface';
    import type { NamedNode, BlankNode } from '@rdfjs/types';
    import type { Store } from 'n3';
    import { getCompactURI, getLocalName } from '$lib/rdf/utils';

    interface Props {
        open: boolean;
        pointer: GraphPointer<NamedNode | BlankNode, Store>;
        iri: string;
    }

    let { open = $bindable(), pointer, iri }: Props = $props();
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-lg">
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2">
                <Database class="h-5 w-5" />
                Instances of {getLocalName(iri)}
            </Dialog.Title>
            <Dialog.Description>
                <code class="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{getCompactURI(iri)}</code>
            </Dialog.Description>
        </Dialog.Header>
        
        <div class="flex flex-col items-center justify-center py-12 text-center">
            <div class="rounded-full bg-muted p-4 mb-4">
                <Construction class="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 class="text-lg font-medium mb-2">Coming Soon</h3>
            <p class="text-sm text-muted-foreground max-w-sm mb-6">
                View, create, edit, and delete instances of this type.
            </p>
            <div class="flex flex-wrap gap-2 justify-center">
                <Badge variant="outline">View</Badge>
                <Badge variant="outline">Create</Badge>
                <Badge variant="outline">Edit</Badge>
                <Badge variant="outline">Delete</Badge>
            </div>
        </div>
        
        <Dialog.Footer>
            <Button variant="outline" onclick={() => open = false}>Close</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
