"use strict";

function ab2str(buf) {
	return String.fromCharCode.apply(null, new Uint8Array(buf));
}
	
function str2ab(string) {
	var encoder = new TextEncoder("utf-8");
	return encoder.encode(string);
}

function npRandomBytes(len) {
	return window.crypto.getRandomValues(new Uint8Array(len)) as Uint8Array;
}

interface NPEnc {
	setBaseKey(pw: string): Promise<void>;
	encrypt(data: ArrayBuffer): Promise<NPEncNode>;
	decrypt(data: ArrayBuffer): Promise<ArrayBuffer>;
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

	async encrypt(data: ArrayBuffer): Promise<NPEncNode> {
		var salt = npRandomBytes(64);
		var key = await crypto.subtle.deriveKey(
			{ name: "HKDF", salt: salt, info: str2ab("NPEncV1"), hash: "SHA-256" } as Algorithm,
			this.baseKey,
			{ name: "AES-GCM", length: 256 } as Algorithm,
			false,
			[ "encrypt" ]);
		
		var iv = npRandomBytes(16);
		var res = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv, length: 256, tagLength: 128 } as Algorithm,
											  key, new Uint8Array(data));

		var fullbuf = new Uint8Array(salt.byteLength + iv.byteLength + res.byteLength);
		fullbuf.set(salt, 0);
		fullbuf.set(iv, salt.byteLength);
		fullbuf.set(new Uint8Array(res), salt.byteLength + iv.byteLength);
		
		return { type: "encrypted", data: fullbuf.buffer, meta: { scheme: "NPEncV1" } };
	}
	
	async decrypt(data) {
		var salt = data.slice(0, 64);
		var iv = data.slice(64, 64+16);
		var encdata = data.slice(64+16, data.byteLength);
		
		var key = await crypto.subtle.deriveKey(
			{ name: "HKDF", salt: salt, info: str2ab("NPEncV1"), hash: "SHA-256" } as Algorithm,
			this.baseKey,
			{ name: "AES-GCM", length: 256 } as Algorithm,
			false,
			[ "decrypt" ]);

		var res = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv, tagLength: 128 } as Algorithm,
											  key, encdata);
		
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
		return this.fs[name];
	}

	async put(name: string, data: any) {
		this.fs[name] = data;
	}

	async del(name: string) {
		delete this.fs[name];
	}
	
}

class NPNode {
	type: string;
	meta: any = {};
	data: ArrayBuffer;
}

class NPEncNode extends NPNode {
}

class NPFile extends NPNode {
	constructor() {
		super();
		this.type = "file";
	}
}

class NPFolder extends NPNode {
	constructor() {
		super();
		this.type = "folder";
	}
	
	children: { [s: string]: NPNode } = {};
}

class NP {
	encodeNode(n: NPNode) {
		var data = n.data;
		delete n.data;
		var json = JSON.stringify(n);
		n.data = data;
		
		if (!data) {
			data = new Uint8Array(0).buffer;
		}
		
		var jsonbuf = str2ab(json);
		var buf = new Uint8Array(jsonbuf.byteLength + 1 + data.byteLength);
		buf.set(jsonbuf, 0);
		buf[jsonbuf.byteLength] = 10; // \n
		buf.set(new Uint8Array(data), jsonbuf.byteLength+1);
		return buf.buffer;
	}

	decodeNode(buf: ArrayBuffer): NPEncNode | NPFile | NPFolder {
		var arr = new Uint8Array(buf);
		var i = arr.indexOf(10);
		if (i < 0) {
			throw new Error("Corrupted node: cannot find JSON delimiter");
		}

		var json = arr.slice(0, i);
		var n = JSON.parse(ab2str(json));
		n.data = arr.slice(i+1, arr.byteLength).buffer;

		var ret;
		if (n.type === "encrypted") {
			ret = new NPEncNode();
		} else if (n.type === "file") {
			ret = new NPFile();
		} else if (n.type === "folder") {
			ret = new NPFolder();
		} else {
			throw new Error("Unknown node type "+n.type);
		}

		Object.getOwnPropertyNames(n).forEach(k => {
				ret[k] = n[k];
		});

		if (ret instanceof NPFolder) {
			delete ret.data;
		}

		return ret;
	}
		
	async encryptNode(enc: NPEnc, n: NPNode) {
		var nodebuf = this.encodeNode(n);
		var encnode = await enc.encrypt(nodebuf);
		return this.encodeNode(encnode);
	}

	async decryptNode(enc: NPEnc, n: NPNode) {
		var data = await enc.decrypt(n.data);
		return this.decodeNode(data);
	}
	
	async test() {
		var store = new NPStorageMemory();
		var enc = new NPEncV1();
		await enc.setBaseKey("pass");

		var root = new NPFolder();
		var encroot = await this.encryptNode(enc, root);

		var node = this.decodeNode(encroot);
		if (node instanceof NPEncNode) {
			if (node.meta.scheme === "NPEncV1") {
				var root2 = await this.decryptNode(enc, node);
				console.log(root2);
			} else {
				throw new Error("Unknown encryption scheme "+node.meta.scheme);
			}
		}
	}
}

var np = new NP();
np.test();
