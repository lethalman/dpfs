Distributed Private Filesystem
============

Rationale
----------

Do you have private documents or password keyrings that you keep on your hard drive? Do you need a replica of them? Do you encrypt them before uploading to a cloud storage? This is what dpfs is supposed to do.

Syncthing, Tahoe-LAFS and such do not support cloud services, do not support multi-level encryption schemes, and are not suitable for password storage.

Architecture
---------

- A filesystem is a unified view of one or multiple toplevel directories.
- A toplevel directory has one or multiple copies. Each copy is called "replica" and can be saved over different storages. By default the node of a toplevel directory is `root.dpn`.
- A directory has children nodes which in turn may be either files or directories.
- A storage interface supports low-level operations only like `get`, `put` and `delete` over blobs of data.
- A proxy exposes a storage interface for one or multiple toplevel directories.
- A client is in charge of organizing, encrypting and replicating the data.

Root directory:
```
root.dpn:
{ "enc": "..." }
encrypted data -> { "type": "inode/directory", "nodes": [ { "name": "weeee", "node": "lakheglkahe.dpn" } ] }
```

Children of a directory:
```
lakheglkahe.dpn:
{ "enc": "..." }
encrypted data -> { "type": "password", "description": ... } data

hgkrhlrgha.dpn:
{ "enc": "..." }
encrypted data -> { "type": "text/plain", ... } data

iehghakenz.dpn:
{ "enc": "..." }
encrypted data -> { "type": "inode/directory", "nodes": { ... } }
```

Configuration
------------

```
{
	"enc": default encryption scheme...,
	"directories": {
		"/foo": {
			"replicas": [
				{ "type": "local", ... },
				{ "type": "ssh", ... },
				{ "type": "gdrive", ... },
				{ "type": "owncloud", ... },
				{ "type": "dpfsproxy", ... }
			]
		}
	}
}
```

UI
--------------

Web UI with client encryption.

Browser, encrypts and organizes data -> Web server, performs operations over the storage.

Versioning
-----------

Think of a user-friendly way to handle conflicts.
