
//this seems terrible, someone fix javascript

import { mainControl } from './main.js';

export function setupImports() {
	(window as any).mainControl = mainControl;
}


