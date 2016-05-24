"use strict";

interface NPCrypto {
	keyFromString(str: string): Promise<any>;

	randomBytes(len: number);
	
	pbkdf2(baseKey, salt, iterations, hash): Promise<any>;
}

class NPWebCrypto implements NPCrypto {
	constructor(public crypto: Crypto) {}
	
	static str2ab(string) {
		var encoder = new TextEncoder("utf-8");
		return encoder.encode(string);
	}
	
	keyFromString(str) {
		return crypto.subtle.importKey("raw", NPWebCrypto.str2ab(str), { name: "PBKDF2" }, false, [ "deriveKey" ]);
	}

	randomBytes(len) {
		var array = new Uint8Array(len);
		window.crypto.getRandomValues(array);
		return array;
	}
	
	pbkdf2(baseKey, salt, iterations, hash) {
		return crypto.subtle.deriveKey(
			{ name: "PBKDF2", salt: salt, iterations: iterations, hash: hash } as Algorithm,
			baseKey,
			{ name: "AES-GCM", length: 256 } as Algorithm,
			false,
			[ "encrypt" ]);
	}
}

var NPCryptoImpl: NPCrypto;
if (window && window.crypto) {
	NPCryptoImpl = new NPWebCrypto(window.crypto);
}

class NP {
	constructor(public crypto: NPCrypto) {
	}

	async test() {
		console.log("asd");
		var userKey = await this.crypto.keyFromString("asd");
		var masterSalt = this.crypto.randomBytes(64);
		var masterKey = await this.crypto.pbkdf2(userKey, masterSalt, 100, "SHA-1");
		console.log(masterKey);
	}
}

var np = new NP(NPCryptoImpl);
np.test();
