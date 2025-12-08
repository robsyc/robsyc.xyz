import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ request }) => {
	const accept = request.headers.get('accept');

	if (accept) {
		if (accept.includes('text/turtle')) {
			throw redirect(307, '/onto.ttl');
		}
		if (accept.includes('application/ld+json')) {
			throw redirect(307, '/onto.jsonld');
		}
	}

	throw redirect(301, '/app');
};
