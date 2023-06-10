
//man this is so much code

import * as layer from './layer.js';

export function addDirectory(directory: layer.CyclemapLayerSpecification) {
	layer.addLayerButtons(directory.source as any);
}

export function removeDirectory(directory: layer.CyclemapLayerSpecification) {
	layer.removeLayerButtons(directory.source as any);
}

