# Original collection dependency profile

The original application source and `legacy.html` stay in their existing locations.
These manifests preserve the original dependency versions, including known audit
findings. They are excluded from the new game's production install and build.

For local maintenance only:

```sh
npm ci --prefix legacy
npm run dev:legacy -- --host 127.0.0.1 --port 5174
```

Open `/legacy.html` on that port. Do not use this profile for a new release.
The old Node 16 Dockerfile also remains historical; use `Dockerfile.beta` for the
new application after the release gates have passed.
