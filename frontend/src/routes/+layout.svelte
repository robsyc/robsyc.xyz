<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	import { ModeWatcher } from "mode-watcher";

	let { children } = $props();

	const meta = {
		title: 'robsyc.xyz',
		description: 'Personal website of Robbe Claeys, exploring Linked Data, neuro-symbolic AI, and bouldering.',
		url: 'https://robsyc.xyz'
	};

	const schema = {
		'@context': 'https://schema.org',
		'@type': 'Person',
		name: 'Robbe Claeys',
		alternateName: 'robsyc',
		url: meta.url,
		knowsAbout: ['Linked Data', 'neuro-symbolic AI', 'bouldering']
	};
</script>

<ModeWatcher />

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />
	<link rel="icon" href={favicon} />
	<script type="application/ld+json">
		{@html JSON.stringify(schema)}
	</script>

	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap" rel="stylesheet">
</svelte:head>

<main class="h-screen">
	{@render children?.()}
</main>