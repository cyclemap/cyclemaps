
//this seems terrible, someone fix javascript

import * as main from './main.js';

export function setupImports() {
	(window as any).cyclemap = main;
}


