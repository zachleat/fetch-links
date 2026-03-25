# Fetch Links

## Install

```
npm install @zachleat/fetch-links
```

## Usage

```js
import { Links } from "@zachleat/fetch-links";

// returns <Array>
await Links.find("https://www.zachleat.com/");

/* [
  { url: 'mailto:zach@zachleat.com', via: [ 'link[href][rel="me"]' ] },
  { url: 'https://github.com/zachleat', via: [ 'link[href][rel="me"]' ] },
  // …
] */
```