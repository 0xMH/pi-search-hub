/**
 * Jina-compatible search backend.
 *
 * The hosted default is s.jina.ai. A self-hosted Jina Search service can be
 * selected with a custom searchBaseUrl and searchProvider (normally bing).
 */

import { timeoutSignal, sanitizeError } from "../utils.js";
import { parseJina } from "../../backends/parsers.js";
import type { SearchResult } from "../types.js";

export async function searchJina(
	query: string,
	numResults: number,
	apiKey?: string,
	signal?: AbortSignal,
	searchBaseUrl?: string,
	searchProvider?: "google" | "bing" | "reader",
): Promise<{ results: SearchResult[] }> {
	const defaultBaseUrl = "https://s.jina.ai";
	const baseUrl = (searchBaseUrl ?? defaultBaseUrl).replace(/\/+$/, "");
	const isHosted = baseUrl === defaultBaseUrl;
	const url = new URL(isHosted ? `${baseUrl}/` : `${baseUrl}/search`);
	url.searchParams.set("q", query);
	url.searchParams.set("format", "json");
	if (!isHosted) {
		url.searchParams.set("provider", searchProvider ?? "bing");
		url.searchParams.set("num", String(Math.min(numResults, 20)));
	}

	const headers: Record<string, string> = {
		"Accept": "application/json",
	};
	if (!isHosted) {
		// Search results do not need page crawling here. Ask the self-hosted
		// service to return metadata only, which avoids unnecessary work.
		headers["x-respond-with"] = "no-content";
	}
	// Self-hosted search does not need the hosted Jina API key. Do not send it
	// to a custom endpoint.
	if (isHosted && apiKey) {
		headers["Authorization"] = `Bearer ${apiKey}`;
	}
	const response = await fetch(url, {
		signal: timeoutSignal(signal),
		headers,
	});

	if (!response.ok) {
		const text = await response.text().catch(() => "");
		throw new Error(`Jina AI ${sanitizeError(response.status, text)}`);
	}

	const data = (await response.json()) as Record<string, unknown>;
	return { results: parseJina(data, numResults) };
}
