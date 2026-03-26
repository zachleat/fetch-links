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