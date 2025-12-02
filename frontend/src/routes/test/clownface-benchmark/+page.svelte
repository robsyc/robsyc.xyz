<script lang="ts">
    /**
     * Flow Mapper Performance Benchmark
     * 
     * Tests the performance of the Clownface-powered flow mapper:
     * - Time to create nodes from RDF
     * - Time for property access via GraphPointers
     */
    import { onMount } from 'svelte';
    import { rdfStore, ns } from '$lib/stores/rdf.svelte';
    import { quadsToFlowElements } from '$lib/rdf/flow-mapper-cf';
    import { Button } from "$lib/components/ui/button/index.js";

    interface BenchmarkResult {
        name: string;
        duration: number;
        nodeCount: number;
        edgeCount: number;
    }

    let results = $state<BenchmarkResult[]>([]);
    let isRunning = $state(false);
    let iterations = $state(100);
    let dataLoaded = $state(false);
    
    async function loadData() {
        if (dataLoaded) {
            rdfStore.clear();
        }
        await rdfStore.loadFromUrl('/graphs/home.ttl');
        dataLoaded = true;
        console.log(`[Benchmark] Loaded ${rdfStore.size} quads`);
    }

    async function runBenchmarks() {
        isRunning = true;
        results = [];
        
        if (!dataLoaded) {
            await loadData();
        }

        // Benchmark: quadsToFlowElements
        const times: number[] = [];
        let lastResult: ReturnType<typeof quadsToFlowElements> | null = null;
        
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            lastResult = quadsToFlowElements(rdfStore);
            const end = performance.now();
            times.push(end - start);
        }
        
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        results.push({
            name: 'quadsToFlowElements',
            duration: avgTime,
            nodeCount: lastResult?.nodes.length ?? 0,
            edgeCount: lastResult?.edges.length ?? 0,
        });

        // Benchmark: Property access via GraphPointer
        if (lastResult && lastResult.nodes.length > 0) {
            const accessTimes: number[] = [];
            const nodeData = lastResult.nodes[0].data as any;
            
            for (let i = 0; i < iterations; i++) {
                const start = performance.now();
                // Access properties via pointer
                const name = nodeData.pointer?.out(ns.schema('name'))?.value;
                const desc = nodeData.pointer?.out(ns.schema('description'))?.value;
                const end = performance.now();
                accessTimes.push(end - start);
            }
            
            const avgAccessTime = accessTimes.reduce((a, b) => a + b, 0) / accessTimes.length;
            
            results.push({
                name: 'Property access (pointer)',
                duration: avgAccessTime,
                nodeCount: 0,
                edgeCount: 0,
            });
        }
        
        isRunning = false;
    }

    onMount(() => {
        loadData();
    });
</script>

<div class="min-h-screen bg-background p-8">
    <div class="max-w-2xl mx-auto">
        <h1 class="text-2xl font-bold mb-6">Flow Mapper Performance Benchmark</h1>
        
        <div class="mb-6 p-4 bg-muted rounded-lg">
            <p class="text-sm text-muted-foreground">
                Tests the performance of the Clownface-powered flow mapper.
                Store contains <strong>{rdfStore.size}</strong> quads.
            </p>
        </div>
        
        <div class="flex items-center gap-4 mb-6">
            <label class="text-sm">
                Iterations:
                <input 
                    type="number" 
                    bind:value={iterations}
                    class="ml-2 w-24 px-2 py-1 border rounded"
                />
            </label>
            <Button 
                onclick={runBenchmarks}
                disabled={isRunning || !dataLoaded}
            >
                {isRunning ? 'Running...' : 'Run Benchmark'}
            </Button>
        </div>
        
        {#if results.length > 0}
            <div class="space-y-4">
                <h2 class="text-lg font-semibold">Results ({iterations} iterations)</h2>
                
                <table class="w-full border-collapse">
                    <thead>
                        <tr class="border-b">
                            <th class="text-left py-2">Test</th>
                            <th class="text-right py-2">Avg Time (ms)</th>
                            <th class="text-right py-2">Nodes</th>
                            <th class="text-right py-2">Edges</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each results as result}
                            <tr class="border-b">
                                <td class="py-2">{result.name}</td>
                                <td class="text-right font-mono">{result.duration.toFixed(4)}</td>
                                <td class="text-right">{result.nodeCount || '-'}</td>
                                <td class="text-right">{result.edgeCount || '-'}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
                
                <div class="mt-4 p-4 bg-green-500/10 rounded-lg">
                    <p class="text-sm">
                        <strong>Summary:</strong> Clownface-powered flow mapping provides efficient 
                        graph traversal with lazy property access via GraphPointers.
                    </p>
                </div>
            </div>
        {/if}
    </div>
</div>
