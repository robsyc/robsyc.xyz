<script lang="ts">
	import '../app.css';
	// 👇 this is important! You need to import the styles for Svelte Flow to work
	import '@xyflow/svelte/dist/style.css';

	import { ModeWatcher } from "mode-watcher";
	import { toggleMode } from "mode-watcher";

	// Fix imports to use the correct path for Svelte components
	import { Sun, Moon, Sprout } from "lucide-svelte";
	import { Button } from "$lib/components/ui/button/index.js";

	let { children } = $props();
</script>

<ModeWatcher />

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap" rel="stylesheet">
</svelte:head>

<!-- Full-width header with centered navigation -->
<header class="fixed top-0 left-0 right-0 w-full z-40 flex justify-center pt-4 lg:pt-6">
	<nav class="bg-background/90 backdrop-blur-sm border border-border/40 rounded-full shadow-sm min-w-[200px] max-w-[90%] flex items-center overflow-hidden">
		
		<div class="px-5 py-2">
			<a href="/" class="font-mono text-xl inline-flex items-center leading-none hover:opacity-80 transition-opacity">robsyc.xyz</a>
		</div>
		
		<div class="flex items-center h-full">
			<Button onclick={toggleMode} variant="outline" size="icon" class="rounded-none border-y-0 border-r-0 border-l h-full flex items-center justify-center">
				<Sun class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
				<Moon class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
				<span class="sr-only">Toggle theme</span>
			</Button>

			<Button variant="outline" size="icon" class="rounded-none rounded-r-full border-y-0 border-l-0 border-r h-full flex items-center justify-center">
				<Sprout class="h-[1.2rem] w-[1.2rem]" />
			</Button>
		</div>
	</nav>
</header>

	
<!-- Main Content -->
<main class="h-screen">
	{@render children()}
</main>