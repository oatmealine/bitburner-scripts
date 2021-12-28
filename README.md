# bitburner-scripts
a collection of scripts i used in bitburner

## install
copy the contents of `fuckerfetcher.js` to your clipboard, do `nano fuckerfetcher.js` in-game, paste everything in, ctrl-s and `run fuckerfetcher.js`

this script will let you select which modules of `fuckerdaemon.js` you wish to install, downloads them and creates a config file

## how to setup grafana stuff

open `fuckerdaemon.js`, and uncomment:
```js
const grafana = true;
import { urlPrefix, secret } from './grafanaconfig.js';
```
then comment out:
```js
const grafana = false;
```

afterwards, create a `grafanaconfig.js` file in your home directory with the following:
```js
export const urlPrefix = 'https://example.com/bitburner'; // '/servers' will be sent to 'example.com/bitburner/servers'
export const secret = 'secret phrase'; // sync this with the server backend
```

backend config is documented at [the backend gh page](https://github.com/oatmealine/bitburner-grafana)
