<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

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

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />
	<link rel="icon" href={favicon} />
	<script type="application/ld+json">
		{@html JSON.stringify(schema)}
	</script>
</svelte:head>

{@render children?.()}
