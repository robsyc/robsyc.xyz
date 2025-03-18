<script lang="ts">
	import '../app.css';
	// 👇 this is important! You need to import the styles for Svelte Flow to work
	import '@xyflow/svelte/dist/style.css';

	import { ModeWatcher, toggleMode } from "mode-watcher";

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
	<nav class="bg-background/90 border border-border rounded-full shadow-sm flex items-center overflow-hidden">
		
		<div class="px-4 py-2">
			<a href="/" class="font-mono text-xl inline-flex items-center leading-none hover:opacity-80 transition-opacity">robsyc.xyz</a>
		</div>
		
		<div class="flex items-center h-full">
			<Button onclick={toggleMode} variant="outline" size="icon" class="rounded-none border-y-0 border-r-0 border-l border-border h-full flex items-center justify-center">
				<Sun class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
				<Moon class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
				<span class="sr-only">Toggle theme</span>
			</Button>

			<!-- <Button variant="outline" size="icon" class="rounded-none rounded-r-full border-y-0 border-l-0 border-r h-full flex items-center justify-center">
				<Sprout class="h-[1.2rem] w-[1.2rem]" />
			</Button> -->

			<!-- Social Media Links - https://icons.getbootstrap.com/ -->
			<Button variant="outline" size="icon" class="h-full flex items-center justify-center border-none" 
			href="https://www.linkedin.com/in/robbe-claeys-161595157/" target="_blank" rel="noopener noreferrer">
				<svg xmlns="http://www.w3.org/2000/svg" width="1.2rem" height="1.2rem" fill="currentColor" viewBox="0 0 16 16">
					<path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z"/>
				</svg>
				<span class="sr-only">LinkedIn</span>
			</Button>
			<Button variant="outline" size="icon" class="h-full flex items-center justify-center border-none" 
			href="https://github.com/robsyc" target="_blank" rel="noopener noreferrer">
				<svg xmlns="http://www.w3.org/2000/svg" width="1.2rem" height="1.2rem" fill="currentColor" viewBox="0 0 16 16">
					<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/>
				</svg>
				<span class="sr-only">GitHub</span>
			</Button>
		</div>
	</nav>
</header>

	
<!-- Main Content -->
<main class="h-screen">
	{@render children()}
</main>