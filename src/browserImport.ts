
//this seems terrible, someone fix javascript

import { MainControl } from './main';

export function setupImports(mainControl: MainControl) {
	(window as any).mainControl = mainControl;
}


