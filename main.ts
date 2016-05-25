"use strict";

function ab2str(buf) {
	return String.fromCharCode.apply(null, new Uint8Array(buf));
}
	
function str2ab(string) {
	var encoder = new TextEncoder("utf-8");
	return encoder.encode(string);
}

function npRandomBytes(len) {
	return window.crypto.getRandomValues(new Uint8Array(len));
}

interface NPEncData {
	data: ArrayBuffer;
	meta: any;
}

interface NPEnc {
	setBaseKey(pw: string): Promise<void>;
	encrypt(data: ArrayBuffer): Promise<NPEncData>;
	decrypt(data: ArrayBuffer, meta: any): Promise<ArrayBuffer>;
}

interface NPStorage {
	getAll(name: string): Promise<any>;
	get(name: string): Promise<any>;
	put(name: string, data: any): Promise<any>;
	del(name: string);
}

class NPEncV1 implements NPEnc {
	baseKey: CryptoKey;
	
	constructor() { }

	async setBaseKey(pw: string) {
		this.baseKey = await crypto.subtle.importKey("raw", str2ab(pw), { name: "HKDF" }, false, [ "deriveKey" ]);
	}

	async encrypt(data) {
		var salt = npRandomBytes(64);
		var key = await crypto.subtle.deriveKey(
			{ name: "HKDF", salt: salt, info: str2ab("NPEncV1"), hash: "SHA-256" } as Algorithm,
			this.baseKey,
			{ name: "AES-GCM", length: 256 } as Algorithm,
			false,
			[ "encrypt" ]);
		
		var iv = npRandomBytes(16);
		var res = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv, length: 256, tagLength: 128 } as Algorithm,
											  key, str2ab(data));
		return { data: res, meta: { type: "NPEncV1", salt: salt, iv: iv } };
	}
	
	async decrypt(data, meta) {
		var key = await crypto.subtle.deriveKey(
			{ name: "HKDF", salt: meta.salt, info: str2ab("NPEncV1"), hash: "SHA-256" } as Algorithm,
			this.baseKey,
			{ name: "AES-GCM", length: 256 } as Algorithm,
			false,
			[ "decrypt" ]);

		var res = await crypto.subtle.decrypt({ name: "AES-GCM", iv: meta.iv, tagLength: 128 } as Algorithm,
											  key, data);
		
		return res;
	};
}

class NPStorageMemory implements NPStorage {
	fs: any;
	
	constructor() {
		this.fs = {};
	}
	
	async getAll(name: string) {
		if (this.fs[name]) {
			return [this.fs[name]];
		} else {
			return [];
		}
	}
	
	async get(name: string) {
		return null;
	}

	async put(name: string, data: any) {
		
	}

	async del(name: string) {
		
	}
	
}

class NP {
	async test() {
		var enc = new NPEncV1();
		await enc.setBaseKey("pass");
		var encdata = await enc.encrypt("foobar");
		console.log(encdata);
		var decdata = await enc.decrypt(encdata.data, encdata.meta);
		console.log(ab2str(decdata));
	}
}

var np = new NP();
np.test();
