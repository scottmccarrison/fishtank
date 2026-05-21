// fishtank worker - static asset serving for mccarrison.me/fish
//
// Serves the built Vite/Phaser app from ../dist via the ASSETS binding.
// Redirects bare /fish to /fish/ so relative asset URLs in index.html
// resolve under the subpath route.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const prefix = env.PATH_PREFIX || '/fish';

    if (url.pathname === prefix) {
      return Response.redirect(url.origin + prefix + '/', 301);
    }

    let path = url.pathname;
    if (path.startsWith(prefix + '/')) path = path.slice(prefix.length) || '/';

    const assetUrl = new URL(request.url);
    assetUrl.pathname = path;
    return env.ASSETS.fetch(new Request(assetUrl.toString(), request));
  },
};
