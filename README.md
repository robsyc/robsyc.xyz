# robsyc.xyz

My personal website!

## Tech stack

- [SvelteKit with Svelte 5](https://svelte.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn-svelte]()
- [SvelteFlow]()

## Linked Data Support

This website implements content negotiation to serve RDF data in different formats:

- **HTML**: Default format for browsers - uses [SvelteFlow](https://svelteflow.dev/) to render the linked data dynamically
- **Turtle**: Available at `/rdf/me.ttl` or via content negotiation with `Accept: text/turtle`
- **JSON-LD**: Available at `/rdf/me.jsonld` or via content negotiation with `Accept: application/ld+json`

### CORS Support

The site implements CORS headers to allow cross-origin requests from any domain, which is essential for Linked Data applications. This enables:

- Requests from any origin (`Access-Control-Allow-Origin: *`)
- Support for GET and OPTIONS methods
- Use of Accept headers for content negotiation
- Access to Link headers for discovering alternative representations

You can test the content negotiation with curl:

```bash
# Get the headers
curl -I https://www.robsyc.xyz/

# Check available formats with OPTIONS
curl -X OPTIONS -i https://www.robsyc.xyz/

# Get Turtle representation with content negotiation (with JSON-LD as fallback)
curl -H "Accept: text/turtle,application/ld+json;q=0.9" https://www.robsyc.xyz/
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
