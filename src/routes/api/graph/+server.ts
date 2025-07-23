export const prerender = false;

import type { RequestHandler } from './$types';
import fs from 'fs';
import { join } from 'path';
import { Readable } from 'stream';

const LOCAL_PATH = join(process.cwd(), 'static/graph/florida_graph.bin.br');
const REMOTE_URL = 'https://ipbpbgmecbrmmsad.public.blob.vercel-storage.com/florida_graph.bin.br';

export const GET: RequestHandler = async ({ setHeaders }) => {
	if (fs.existsSync(LOCAL_PATH)) {
		// stream local file
		const stat = fs.statSync(LOCAL_PATH);

		setHeaders({
			'Content-Type': 'application/octet-stream',
			'Content-Encoding': 'br',
			'Content-Length': String(stat.size),
			'Cache-Control': 'public, max-age=31536000'
		});

		const nodeStream = fs.createReadStream(LOCAL_PATH);
		const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;

		return new Response(webStream);
	} else {
		// fetch & proxy remote blob
		const remoteRes = await fetch(REMOTE_URL, { headers: { 'Accept-Encoding': 'br' } });
		if (!remoteRes.ok) return new Response('Remote graph not available', { status: 502 });
		const headers = new Headers(remoteRes.headers);
		headers.set('Cache-Control', 'public, max-age=31536000');
		return new Response(remoteRes.body, { status: 200, headers });
	}
};