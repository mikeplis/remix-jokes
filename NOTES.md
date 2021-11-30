# Cookie session storage

I don't really understand how Remix's cookie session API's work and I don't really follow the code from the tutorial that uses them, so I'm writing down what I know here.

## createCookieSessionStorage

`createCookieSessionStorage` expects to be passed properties of the cookie, like `name`, `path`, and `maxAge`.

_Internally, it just converts the cookie properties into a proper Cookie object (which just has a couple methods like `parse` and `serialize`) and returns an object. There's nothing else magic going on inside._

The returned object has three methods:

-   getSession
-   commitSession
-   destroySession

### getSession

`getSession` is a slight misnomer in my opinion. Having "get" in the name makes me think it's somehow retrieving the session from somewhere, but it's not.

This method _creates_ a session object. This object contains a (private) key/value map and some methods for interacting with that map, like `get`, `set`, and `unset`.

_A "session" just a key/value map that's stored in a cookie_

This method accepts the current session, which can be pulled off the request's cookie header. `getSession` will then `parse` the session (if it's signed, it will decode the session using the `secrets` passed to `createCookieSessionStorage`; if it's unsigned, it'll just `JSON.parse` the session) and create a session object with the key/value map populated with data from the current session. If you don't pass in the current session, it'll just return a session object with an empty key/value map.

_getSession doesn't know anything about the "current session" internally. You must pass it into this method to be able to interact with it. There's no magic here._

### commitSession

Like `getSession`, I think the name of this method was confusing me. "commit" implied that something was being saved in the background, but that's not what's going on.

This method takes a session object (the one returned from `getSession` that has methods like `get` and `set`) and serializes it to a string that then needs to be added to the `Set-Cookie` header in a response.

This header must be set whenever session data is modified in any way.

_It's unclear to me what happens if the server forgets to set the `Set-Cookie` header. Will the next request not have the session at all? Or will it send the old session? Might depend on max-age/expires_

### destroySession

Again, this method doesn't do anything magic. It takes in a session object, deletes all data from the session, and returns a string that needs to be passed to the `Set-Cookie` header.
