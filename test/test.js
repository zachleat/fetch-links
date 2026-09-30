import test from 'node:test';
import assert from "node:assert/strict";

import { Links } from "../links.js";

test("zachleat.com", async (t) => {
	let originalUrl = "https://www.zachleat.com/";
	// let originalUrl = "https://matthiasott.com/";
	// let originalUrl = "https://www.mikeaparicio.com/";
	// let originalUrl = "https://www.miriamsuzanne.com/";
	// let originalUrl = "https://daverupert.com/";
	// let originalUrl = "https://aaadaaam.com/";
	// let originalUrl = "https://torvalds-family.blogspot.com/";
	// let originalUrl = "https://wesbos.com/";
	// let originalUrl = "https://chriscoyier.net/";

	let filtered = await Links.find(originalUrl);
	// console.log( filtered );
	assert.ok(filtered.length > 0);
});

test("searchParams", async (t) => {
	let originalUrl = "https://www.11ty.dev/?q=1";

	let filtered = await Links.find(originalUrl);
	assert.strictEqual(filtered.find(entry => entry.type !== "feed" && entry.url.startsWith("https://www.11ty.dev/")), undefined);
});
test("Fragments are stripped and deduplicated", async (t) => {
	let originalUrl = "https://example.com/";
	let ln = new Links();
	let urls = await ln.findUrls(`<a href="https://other.example/post#liked-by-1">Post</a><a href="https://other.example/post#liked-by-2">Post</a>`, { originalUrl });

	assert.deepEqual(urls.map(entry => entry.url), ["https://other.example/post"]);
});

test("Unlabeled anchors are removed", async (t) => {
	let originalUrl = "https://example.com/";
	let ln = new Links();
	let urls = await ln.findUrls(`<a href="https://avatar.example/"><img src="a.jpg" alt="Avatar"></a>
<a href="https://aria.example/" aria-label="Aria"><svg></svg></a>
<a href="https://title.example/" title="Title"><img src="b.jpg" alt=""></a>
<a href="https://me.example/" rel="me"></a>
<a href="https://text.example/">Text</a>`, { originalUrl });

	let filtered = Links.filterAll(urls, { originalUrl });
	assert.deepEqual(filtered.map(entry => entry.url), [
		"https://aria.example/",
		"https://title.example/",
		"https://me.example/",
		"https://text.example/",
	]);
	assert.equal(filtered[0].content, "Aria");
});

test("Social posts, videos, and discussion threads are removed", async (t) => {
	let socialPosts = [
		"https://bsky.app/profile/zachleat.com/post/3mw4gqd37is2v",
		"https://fediverse.zachleat.com/@zachleat/117315158434228268",
		"https://mastodon.social/users/westbrook/statuses/117332289538177873",
		"https://twitter.com/zachleat/status/123",
		"https://x.com/zachleat/status/123",
		"https://www.youtube.com/watch?v=abc",
		"https://www.youtube.com/shorts/abc",
		"https://youtu.be/abc",
		"https://www.threads.net/@zachleat/post/abc",
		"https://news.ycombinator.com/item?id=49830088",
		"https://lobste.rs/s/wkvtya/ai_make_website_good",
	];
	let profiles = [
		"https://bsky.app/profile/zachleat.com",
		"https://fediverse.zachleat.com/@zachleat",
		"https://twitter.com/zachleat",
		"https://www.youtube.com/@zachleat",
		"https://www.threads.net/@zachleat",
		"https://news.ycombinator.com/user?id=zachleat",
		"https://lobste.rs/~zachleat",
	];

	let results = [...socialPosts, ...profiles].map(url => ({ url, via: ["a[href]"], content: "Link" }));
	let filtered = Links.filterAll(results, { originalUrl: "https://example.com/" });
	assert.deepEqual(filtered.map(entry => entry.url), profiles);
});
