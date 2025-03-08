# robsyc.xyz

My personal website!

## Tech stack

- [SvelteKit with Svelte 5](https://svelte.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn-svelte](https://www.shadcn-svelte.com/)
- [SvelteFlow](https://svelteflow.dev/)

## Linked Data Support

This website implements content negotiation (w/ CORS) to serve RDF data in different formats:

- **HTML**: Default format for browsers - uses [SvelteFlow](https://svelteflow.dev/) to render the linked data dynamically
- **Turtle**: Available at `/rdf/me.ttl` or via content negotiation with `Accept: text/turtle`
- **JSON-LD**: Available at `/rdf/me.jsonld` or via content negotiation with `Accept: application/ld+json`