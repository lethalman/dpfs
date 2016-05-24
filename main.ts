"use strict";

interface NPCrypto {
	randomBytes(len: number);
	keyFromString(str: string): Promise<any>;
	hkdf(baseKey, salt, info): Promise<any>;
}

class NPWebCrypto implements NPCrypto {
	constructor(public crypto: Crypto) {}
	
	static str2ab(string) {
		var encoder = new TextEncoder("utf-8");
		return encoder.encode(string);
	}
	
	keyFromString(str) {
		return crypto.subtle.importKey("raw", NPWebCrypto.str2ab(str), { name: "HKDF" }, false, [ "deriveKey" ]);
	}

	randomBytes(len) {
		var array = new Uint8Array(len);
		window.crypto.getRandomValues(array);
		return array;
	}

	hkdf(baseKey, salt, info) {
		return crypto.subtle.deriveKey(
			{ name: "HKDF", salt: salt, info: NPWebCrypto.str2ab(info), hash: "SHA-256" } as Algorithm,
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
}

interface NPEnc {
	generateKey(): Promise<NPEncKey>;
}

class NPEncV1Key implements NPEncKey {
	constructor(public key: CryptoKey, public salt) {
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
		return new NPEncV1Key(key, salt);
	};
}

class NP {
	constructor(public crypto: NPCrypto) {
	}

	async createRoot(pw: string) {
		var userKey = await this.crypto.keyFromString(pw);
		var enc = new NPEncV1(this.crypto, userKey);
		var folder = new NPFolder(enc);
		return folder;
	}

	async test() {
		var folder = await this.createRoot("foo");
		console.log(folder.enc);
	}
}

class NPFolder {
	constructor(public enc: NPEnc) {
	}
}

var np = new NP(NPCryptoImpl);
np.test();
