
export class LengthUtil {
	private static MILE = 1609.344; // exact definition
	private static YARD = LengthUtil.MILE/1760;  // exact definition
	private static FOOT = LengthUtil.MILE/5280; // exact definition
	private static INVERSE_FOOT = 1/LengthUtil.FOOT;
	private static INCH = LengthUtil.FOOT/12; // exact definition

	/**
	 * https://wiki.openstreetmap.org/wiki/Map_features/Units
	 * m km mi nmi '" yd
	 */
	public static parseLength(lengthString: string): number | undefined {
		lengthString=lengthString.trim();
		let match = lengthString.match(/^([\d.]+)$/);
		if(match !== null) {
			return +match[1];
		}
		match = lengthString.match(/^([\d.]+)\s*m$/);
		if(match !== null) {
			return +match[1];
		}
		match = lengthString.match(/^([\d.]+)\s*km$/);
		if(match !== null) {
			return +match[1] * 1000;
		}
		match = lengthString.match(/^([\d.]+)\s*mi$/);
		if(match !== null) {
			return +match[1] * LengthUtil.MILE;
		}
		match = lengthString.match(/^([\d.]+)\s*nmi$/);
		if(match !== null) {
			return +match[1] * 1852;
		}
		match = lengthString.match(/^([\d.]+)\s*'\s*([\d.]+)\s*"$/);
		if(match !== null) {
			return (+match[1] * 12 + +match[2]) * LengthUtil.INCH;
		}
		match = lengthString.match(/^([\d.]+)\s*yd$/);
		if(match !== null) {
			return +match[1] * LengthUtil.YARD;
		}
		console.error(`unexpected length ${lengthString}`);
		return undefined;
	}

	/*
	private static testParseLength() {
		console.log(LengthUtil.parseLength('3 m')! - 3);
		console.log(LengthUtil.parseLength('0.2 km')! - 200);
		console.log(LengthUtil.parseLength('1.45 mi')! - 2333.5488);
		console.log(LengthUtil.parseLength('6 nmi')! - 11112);
		console.log(LengthUtil.parseLength('12\'5"')! - 3.7846);
		console.log(LengthUtil.parseLength('40 yd')! - 36.576);
	}
	*/
}

