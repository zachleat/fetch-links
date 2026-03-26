import Fetch from "@11ty/eleventy-fetch";
import posthtml from "posthtml";
import posthtmlUrls from "@11ty/posthtml-urls";

export class Links {
	static async find(originalUrl, options = {}) {
		let { fetchOptions } = options;
		let ln = new Links();
		let html = await ln.fetch(originalUrl, fetchOptions);
		let urls = await ln.findUrls(html, {
			originalUrl
		});

		return Links.filterAll(urls, { originalUrl });
	}

	async fetch(url, options = {}) {
		let fetchOptions = Object.assign({
			type: "text",
			// duration: "1d",
			// verbose: true,
			showErrors: true,
		}, options);

		return Fetch(url, fetchOptions);
	}

	static normalizeUrl(url, origin) {
		return (new URL(url, origin)).toString();
	}

	async findUrls(html, options = {}) {
		let { originalUrl } = options;
		let urls = new Map();

		let posthtmlOptions = {
			eachURL: function(url, attr, tagName, node) {
				if(url.startsWith("#") || tagName === "img" || tagName === "video" || tagName === "source") {
					return url;
				}

				let normalized = originalUrl ? Links.normalizeUrl(url, originalUrl) : url;
				let key = normalized;
				let via = `${tagName}[${attr}]${node.attrs.rel ? `[rel="${node.attrs.rel}"]` : ""}`;
				if(urls.has(key)) {
					urls.get(key).via.add(via);
				} else {
					urls.set(key, {
						url: normalized,
						via: new Set([via]),
					});
				}

				return url;
			}
		};

		await posthtml().use( posthtmlUrls(posthtmlOptions) ).process(html);

		return Array.from(urls.values().map(entry => {
			entry.via = Array.from(entry.via);
			return entry;
		}));
	}

	static filterAll(results, options = {}) {
		let { originalUrl } = options;

		let filtered = results
			.filter(entry => this.onlyKeepExternal(entry, originalUrl))
			.filter(entry => this.onlyKeepRelevant(entry));

		return this.sortByRelMe(filtered);
	}

	static sortByRelMe(results) {
		return results.sort((a, b) => {
			let aHasRelMe = a.via.find(via => via.includes(`[rel="me"]`));
			let bHasRelMe = b.via.find(via => via.includes(`[rel="me"]`));
			if(aHasRelMe && bHasRelMe) {
				return 0;
			}
			if(aHasRelMe) {
				return -1;
			}
			if(bHasRelMe) {
				return 1;
			}
			return a.url.length - b.url.length;
		});
	}

	static onlyKeepExternal(entry, originalUrl) {
		let comparison = originalUrl || "https://example.com";
		let u = new URL(entry.url, comparison);
		return !u.toString().startsWith(comparison);
	}

	static onlyKeepRelevant(entry) {
		if(entry.via.find(via => via.startsWith("script[") ||
				via.includes(`[rel="dns-prefetch"]`) ||
				via.includes(`[rel="token_endpoint"]`) ||
				via.includes(`[rel="authorization_endpoint"]`) ||
				via.includes(`[rel="publickey"]`) ||
				via.includes(`[rel="preconnect"]`) ||
				via.includes(`[rel="webmention"]`) ||
				via.includes(`[rel="pingback"]`) ||
				via.startsWith("link[") && via.includes(`[rel="stylesheet"]`))) {
			return false;
		}
		return true;
	}
}