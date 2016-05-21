Distributed Private Filesystem
============

Architecture
---------

A filesystem is a unified view of one or multiple toplevel namespaces.
A namespace has one or multiple copies. Each copy is called "replica" and can be saved over different storages.
A storage interface supports low-level operations only like `get`, `put`, `delete` over blobs of data.
A proxy exposes a storage interface for one or multiple namespaces.
A client is in charge of organizing, encrypting and replicating the data.

Root of a namespace:
```
root.dpn:
{ "enc": "..." }
encrypted data -> { "nodes": [ { "name": "weeee", "node": "lakheglkahe.dpn" } ] }
```

Nodes of the namespace:
```
lakheglkahe.dpn:
{ "enc": "..." }
encrypted data -> { "type": "password", "description": ... } data

hgkrhlrgha.dpn:
{ "enc": "..." }
encrypted data -> { "type": "text/plain", ... } data
```

Configuration
------------

```
{
	"enc": default encryption scheme...,
	"namespaces": {
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
