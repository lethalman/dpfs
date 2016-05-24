"use strict";

function ab2str(buf) {
	return String.fromCharCode.apply(null, new Uint8Array(buf));
}
	
function str2ab(string) {
	var encoder = new TextEncoder("utf-8");
	return encoder.encode(string);
}

interface NPCrypto {
	randomBytes(len: number);
	keyFromString(str: string): Promise<any>;
	hkdf(baseKey, salt, info): Promise<any>;
}

class NPWebCrypto implements NPCrypto {
	constructor(public crypto: Crypto) {}
	
	keyFromString(str) {
		return crypto.subtle.importKey("raw", str2ab(str), { name: "HKDF" }, false, [ "deriveKey" ]);
	}

	randomBytes(len) {
		var array = new Uint8Array(len);
		window.crypto.getRandomValues(array);
		return array;
	}

	hkdf(baseKey, salt, info) {
		return crypto.subtle.deriveKey(
			{ name: "HKDF", salt: salt, info: str2ab(info), hash: "SHA-256" } as Algorithm,
			baseKey,
			{ name: "AES-GCM", length: 256 } as Algorithm,
			false,
			[ "encrypt", "decrypt" ]);
	}

}

var NPCryptoImpl: NPCrypto;
if (window && window.crypto) {
	NPCryptoImpl = new NPWebCrypto(window.crypto);
}

type GenerateKey = () => Promise<CryptoKey>;

interface NPEncKey {
	toJSON(): any;
	encrypt(data): Promise<any>;
	decrypt(data, iv, mac): Promise<any>;
}

interface NPEnc {
	generateKey(): Promise<NPEncKey>;
}

class NPEncV1Key implements NPEncKey {
	constructor(public crypto: NPCrypto, public key: CryptoKey, public salt) {
	}

	async encrypt(data) {
		var iv = this.crypto.randomBytes(12);
		var res = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv, tagLength: 128 } as Algorithm,
											  this.key, str2ab(data));
		/* console.log(ab2str(res.slice(data.byteLength, 128/8))); */
		console.log(new Uint8Array(res), res.byteLength);
		return { data: res.slice(0, 6), mac: res.slice(data.byteLength, 128/8), iv: iv };
	}

	async decrypt(data, iv, mac) {
		var res = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv, tagLength: 128 } as Algorithm,
											  this.key, data);
		var decmac = res.slice(data.byteLength, 128/8);
		console.log(new Uint8Array(res), res.byteLength);
		if (mac !== decmac) {
			throw new Error("MAC do not match");
		}
		
		return res;
	}
	
	toJSON() {
		return { type: "NPEncV1", salt: this.salt };
	}
}

class NPEncV1 implements NPEnc {
	constructor(public crypto: NPCrypto, public baseKey: CryptoKey) {
	}

	async generateKey(): Promise<NPEncKey> {
		var salt = this.crypto.randomBytes(64);
		var key = await this.crypto.hkdf(this.baseKey, salt, "NPEncV1");
		return new NPEncV1Key(this.crypto, key, salt);
	};
}

class NP {
	constructor(public crypto: NPCrypto) {
	}

	async createRoot(pw: string) {
		var userKey = await this.crypto.keyFromString(pw);
		var enc = new NPEncV1(this.crypto, userKey);
		var folder = new NPFolder();
		return folder;
	}

	async test() {
		var userKey = await this.crypto.keyFromString("asd");
		var enc = new NPEncV1(this.crypto, userKey);
		var key = await enc.generateKey();

		var encobj = await key.encrypt("foobar");
		var decdata = await key.decrypt(encobj.data, encobj.iv, encobj.mac);
		/* console.log(decdata.byteLength, ab2str(decdata)); */
		
		var folder = await this.createRoot("foo");

		
	}
}

class NPFolder {
	constructor() {
	}
}

var np = new NP(NPCryptoImpl);
np.test();
