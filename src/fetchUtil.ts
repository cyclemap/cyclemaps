
export class FetchUtil {
	private static CYCLEMAPS_MAPBOX_PUBLIC_ACCESS_TOKEN = process.env.CYCLEMAPS_MAPBOX_PUBLIC_ACCESS_TOKEN;

	public static async fetch(url: string): Promise<string> {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`http error. status: ${response.status}`);
		}

		let text = await response.text();
		if(FetchUtil.CYCLEMAPS_MAPBOX_PUBLIC_ACCESS_TOKEN !== undefined) {
			text = text.replaceAll("{CYCLEMAPS_MAPBOX_PUBLIC_ACCESS_TOKEN}", FetchUtil.CYCLEMAPS_MAPBOX_PUBLIC_ACCESS_TOKEN);
		}
		return text;
	}

	public static async fetchAndParse(url: string): Promise<any> {
		return await JSON.parse(await FetchUtil.fetch(url));
	}
}


