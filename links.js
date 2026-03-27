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
		let u = new URL(url, origin);

		// github.com/username/ becomes github.com/username (for no real good reason)
		if(u.hostname === "github.com" && u.pathname.endsWith("/")) {
			u.pathname = u.pathname.slice(0, -1);
		}

		return u.toString();
	}

	static fetchContent(node) {
		// node has children
		if(Array.isArray(node?.content)) {
			let children = node.content.filter(entry => {
				return typeof entry !== "string" || !entry.startsWith("<!--") && !entry.endsWith("-->");
			}).filter(Boolean);

			if(children.length > 0) {
				return " " + children.map(child => this.fetchContent(child)).filter(Boolean).join("");
			}
		}

		if(typeof node === "string") {
			return node;
		}
		return "";
	}

	// TODO de-duplicate via subdomain redirects (see speedlify 11ty leaderboards) e.g. 11ty.dev versus www.11ty.dev
	async findUrls(html, options = {}) {
		let { originalUrl } = options;
		let urls = new Map();

		let posthtmlOptions = {
			eachURL: function(url, attr, tagName, node) {
				if(url.startsWith("#") ||
					url.startsWith("javascript:") ||
					url.startsWith("at://") ||
					// forms
					tagName === "form" && attr === "action" ||
					(tagName === "link" && (
						// app icons
						node.attrs.rel === "icon" ||
						node.attrs.rel === "mask-icon" ||
						node.attrs.rel === "shortcut icon" ||
						node.attrs.rel === "apple-touch-icon" ||
						node.attrs.rel === "apple-touch-icon-precomposed") ||
						// app manifest
						node.attrs.rel === "manifest" ||
						// script
						node.attrs.rel === "modulepreload"
					) ||
					(tagName === "link" && 
						node.attrs.as === "font" &&
						node.attrs.type?.startsWith("font/")
					) ||
					// media
					tagName === "img" ||
					tagName === "audio" ||
					tagName === "video" ||
					tagName === "source") {
					return url;
				}

				let normalized = originalUrl ? Links.normalizeUrl(url, originalUrl) : url;
				let key = Links.stripProtocol(normalized.toLowerCase());
				let via = `${tagName}[${attr}]${node.attrs.rel ? `[rel="${node.attrs.rel}"]` : ""}`;
				let type;
				let priority = 0;

				// TODO add a scope to the section (header/footer/main)
				let content = Links.fetchContent(node).trim();

				if(node.attrs.rel && (node.attrs.type === "application/atom+xml" || node.attrs.type === "application/rss+xml")) {
					type = "feed";
					priority = 1;
				}
				if(node.attrs?.rel === "me") {
					priority = 1;
				}

				if(urls.has(key)) {
					let entry = urls.get(key);
					entry.via.add(via);
					if(!entry.type) {
						entry.type = type;
					}
					if(!entry.priority) {
						entry.priority = priority;
					}
					if(!entry.content) {
						entry.content = content;
					}
				} else {
					urls.set(key, {
						url: normalized,
						via: new Set([via]),
						type,
						priority,
						content,
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

		return filtered;
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

	static stripProtocol(url) {
		if(url.startsWith("https://")) {
			url = url.slice("https://".length);
		} else if(url.startsWith("http://")) {
			url = url.slice("http://".length);
		}
		return url;
	}

	static onlyKeepExternal(entry, originalUrl) {
		if(entry.type) { // keep feeds and other important types
			return true;
		}

		let comparison = originalUrl || "https://example.com";
		let u = this.stripProtocol((new URL(entry.url, comparison)).toString());
		
		return !u.startsWith(this.stripProtocol(comparison));
	}

	static onlyKeepRelevant(entry) {
		if(entry.via.find(via => via.startsWith("script[") ||
				via.includes(`[rel="preload"]`) ||
				via.includes(`[rel="dns-prefetch"]`) ||
				via.includes(`[rel="token_endpoint"]`) ||
				via.includes(`[rel="authorization_endpoint"]`) ||
				via.includes(`[rel="indieauth-metadata"]`) ||
				via.includes(`[rel="micropub"]`) ||
				via.includes(`[rel="microsub"]`) ||
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