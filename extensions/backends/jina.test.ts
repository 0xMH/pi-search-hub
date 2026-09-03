import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchJina } from "./jina.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function okResponse(data: unknown) {
	return {
		ok: true,
		json: async () => data,
		text: async () => JSON.stringify(data),
	};
}

describe("searchJina", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		mockFetch.mockResolvedValue(okResponse({
			data: [{ title: "Result", url: "https://example.com", description: "Snippet" }],
		}));
	});

	it("uses hosted Jina Search by default and sends its API key", async () => {
		await searchJina("test query", 5, "hosted-key");

		const [input, init] = mockFetch.mock.calls[0] as [URL, RequestInit];
		expect(input.toString()).toBe("https://s.jina.ai/?q=test+query&format=json");
		expect((init.headers as Record<string, string>).Authorization).toBe("Bearer hosted-key");
	});

	it("uses a self-hosted Search endpoint and does not send the hosted key", async () => {
		const result = await searchJina(
			"OpenAI",
			5,
			"hosted-key",
			undefined,
			"https://jina-search.example.com/",
			"bing",
		);

		const [input, init] = mockFetch.mock.calls[0] as [URL, RequestInit];
		expect(input.toString()).toBe(
			"https://jina-search.example.com/search?q=OpenAI&format=json&provider=bing&num=5",
		);
		expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
		expect((init.headers as Record<string, string>)["x-respond-with"]).toBe("no-content");
		expect(result.results[0]).toMatchObject({
			title: "Result",
			url: "https://example.com",
		});
	});

	it("supports the self-hosted reader provider", async () => {
		await searchJina("cached result", 10, undefined, undefined, "https://search.example.com", "reader");

		const [input] = mockFetch.mock.calls[0] as [URL, RequestInit];
		expect(input.searchParams.get("provider")).toBe("reader");
		expect(input.searchParams.get("num")).toBe("10");
	});
});
