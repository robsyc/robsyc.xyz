<script lang="ts">
    /**
     * Clownface Integration Test Page
     * 
     * Tests N3.Store + Clownface compatibility in the browser.
     * Verifies the new fluent graph traversal API works correctly.
     */
    import { onMount } from 'svelte';
    import { rdfStore, ns, followPath } from '$lib/stores/rdf.svelte';
    import { DataFactory } from 'n3';

    const { namedNode } = DataFactory;

    // Test results
    let testResults = $state<Array<{ name: string; passed: boolean; details: string }>>([]);
    let isLoading = $state(true);
    let error = $state<string | null>(null);

    async function runTests() {
        testResults = [];
        
        try {
            // Load the home.ttl graph
            await rdfStore.loadFromUrl('/graphs/home.ttl');

            // Test 1: Basic Clownface pointer creation
            testResults.push(runTest('Clownface pointer creation', () => {
                const ptr = rdfStore.cf.pointer();
                return ptr !== undefined && ptr !== null;
            }));

            // Test 2: Named node traversal
            testResults.push(runTest('Named node traversal', () => {
                const agentPtr = rdfStore.pointer('http://rosyc.xyz#robsyc');
                const name = agentPtr.out(ns.schema('name')).value;
                return name === 'robsyc';
            }));

            // Test 3: Find by type
            testResults.push(runTest('Find resources by rdf:type', () => {
                const agents = rdfStore.byType(ns.foaf('Agent') as any);
                return agents.terms.length >= 1;
            }));

            // Test 4: Multiple property traversal
            testResults.push(runTest('Multiple property traversal', () => {
                const navPtr = rdfStore.pointer('http://rosyc.xyz#WelcomeNav');
                const name = navPtr.out(ns.schema('name')).value;
                const desc = navPtr.out(ns.schema('description')).value;
                return name === 'Welcome' && desc !== undefined;
            }));

            // Test 5: Multi-pointer support (get all values)
            testResults.push(runTest('Multi-pointer values', () => {
                const navPtr = rdfStore.pointer('http://rosyc.xyz#WelcomeNav');
                const actions = navPtr.out(ns.schema('potentialAction')).terms;
                return actions.length >= 2;
            }));

            // Test 6: Inverse traversal (.in() method)
            testResults.push(runTest('Inverse traversal with .in()', () => {
                // Find who has the WelcomeNav as a part
                const welcomeNav = rdfStore.pointer('http://rosyc.xyz#WelcomeNav');
                const containers = welcomeNav.in(ns.schema('hasPart')).terms;
                return containers.length >= 1;
            }));

            // Test 7: Get SHACL NodeShapes
            testResults.push(runTest('Find SHACL NodeShapes', () => {
                const shapes = rdfStore.cf.getNodeShapes();
                return shapes.terms.length >= 1;
            }));

            // Test 8: Shape target traversal
            testResults.push(runTest('Shape target traversal', () => {
                const shapes = rdfStore.cf.getNodeShapes();
                let hasTargetNode = false;
                let hasTargetClass = false;
                
                shapes.forEach((shape: any) => {
                    const targetNode = shape.out(ns.sh('targetNode')).term;
                    const targetClass = shape.out(ns.sh('targetClass')).term;
                    if (targetNode) hasTargetNode = true;
                    if (targetClass) hasTargetClass = true;
                });
                
                return hasTargetNode; // home.ttl has sh:targetNode shapes
            }));

            // Test 9: Property shape path extraction
            testResults.push(runTest('Property shape path extraction', () => {
                const shapes = rdfStore.cf.getNodeShapes();
                let hasProperties = false;
                
                shapes.forEach((shape: any) => {
                    const properties = shape.out(ns.sh('property')).terms;
                    if (properties.length > 0) {
                        hasProperties = true;
                    }
                });
                
                return hasProperties;
            }));

            // Test 10: Complex path - inverse path detection
            testResults.push(runTest('Inverse path detection', () => {
                // Find the agent shape with inverse path
                const agentShape = rdfStore.pointer('http://rosyc.xyz#robsycAgentShape');
                const messageProperty = agentShape.out(ns.sh('property')).filter((prop: any) => {
                    const pathPtr = prop.out(ns.sh('path'));
                    // Check if it's a blank node (complex path)
                    return pathPtr.term?.termType === 'BlankNode';
                });
                
                // Check if the inverse path exists
                let hasInversePath = false;
                messageProperty.forEach((prop: any) => {
                    const pathPtr = prop.out(ns.sh('path'));
                    const inversePath = pathPtr.out(ns.sh('inversePath')).term;
                    if (inversePath) {
                        hasInversePath = true;
                    }
                });
                
                return hasInversePath;
            }));

            // Test 11: clownface-shacl-path followPath (if inverse path exists)
            testResults.push(runTest('followPath with inverse path', () => {
                // Get the agent pointer
                const agentPtr = rdfStore.pointer('http://rosyc.xyz#robsyc');
                
                // Get the inverse path from the shape
                const agentShape = rdfStore.pointer('http://rosyc.xyz#robsycAgentShape');
                const messagePropShape = agentShape.out(ns.sh('property')).filter((prop: any) => {
                    const pathPtr = prop.out(ns.sh('path'));
                    return pathPtr.term?.termType === 'BlankNode';
                });
                
                let foundMessages = false;
                messagePropShape.forEach((prop: any) => {
                    const pathPtr = prop.out(ns.sh('path'));
                    try {
                        // Follow the inverse path: find messages where agent is sender
                        const messages = followPath(agentPtr, pathPtr);
                        if (messages.terms.length > 0) {
                            foundMessages = true;
                        }
                    } catch (e) {
                        console.error('followPath error:', e);
                    }
                });
                
                return foundMessages;
            }));

            // Test 12: Dataset manipulation - addOut
            testResults.push(runTest('Dataset manipulation (addOut)', () => {
                const sizeBefore = rdfStore.size;
                
                // Add a test triple
                const testNode = rdfStore.cf.namedNode('http://example.org/test');
                testNode.addOut(ns.rdfs('label'), 'Test Node');
                
                const sizeAfter = rdfStore.size;
                const label = testNode.out(ns.rdfs('label')).value;
                
                // Clean up
                testNode.deleteOut(ns.rdfs('label'));
                
                return sizeAfter > sizeBefore && label === 'Test Node';
            }));

        } catch (e) {
            error = e instanceof Error ? e.message : 'Unknown error';
            console.error('Test error:', e);
        } finally {
            isLoading = false;
        }
    }

    function runTest(name: string, testFn: () => boolean): { name: string; passed: boolean; details: string } {
        try {
            const passed = testFn();
            return { name, passed, details: passed ? 'OK' : 'Assertion failed' };
        } catch (e) {
            return { 
                name, 
                passed: false, 
                details: e instanceof Error ? e.message : 'Unknown error' 
            };
        }
    }

    onMount(() => {
        runTests();
    });

    const passedCount = $derived(testResults.filter(t => t.passed).length);
    const totalCount = $derived(testResults.length);
</script>

<div class="min-h-screen bg-background p-8">
    <div class="max-w-2xl mx-auto">
        <h1 class="text-2xl font-bold mb-6">Clownface + N3.Store Integration Tests</h1>
        
        {#if isLoading}
            <div class="flex items-center gap-2 text-muted-foreground">
                <div class="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                Running tests...
            </div>
        {:else if error}
            <div class="bg-destructive/10 text-destructive p-4 rounded-lg">
                <strong>Error:</strong> {error}
            </div>
        {:else}
            <div class="mb-6 p-4 rounded-lg {passedCount === totalCount ? 'bg-green-500/10' : 'bg-yellow-500/10'}">
                <span class="font-medium">
                    {passedCount}/{totalCount} tests passed
                </span>
            </div>

            <div class="space-y-2">
                {#each testResults as result}
                    <div class="flex items-start gap-3 p-3 rounded-lg border {result.passed ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}">
                        <span class="text-lg {result.passed ? 'text-green-500' : 'text-red-500'}">
                            {result.passed ? '✓' : '✗'}
                        </span>
                        <div class="flex-1">
                            <div class="font-medium">{result.name}</div>
                            {#if !result.passed}
                                <div class="text-sm text-muted-foreground mt-1">{result.details}</div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>

            <div class="mt-8">
                <button 
                    class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    onclick={() => { isLoading = true; rdfStore.clear(); runTests(); }}
                >
                    Re-run Tests
                </button>
            </div>
        {/if}
    </div>
</div>

