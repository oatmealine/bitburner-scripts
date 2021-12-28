// fuckerdaemon.js
// acts as an auto-launcher for everythingfucker, serverfucker, hacknetfucker to reduce ram usage
// youre still able to run the individual files! its just not as efficient
// uses up 18.80GB with everything enabled

// if it gives you an error here, use fuckerfetcher.js
import { fuckers } from './config.js';

// if you wish to use grafana support
// create a grafanaconfig.js file, containing the following:
//
// export const urlPrefix = 'https://example.com/bitburner'; // '/servers' will be sent to 'example.com/bitburner/servers'
// export const secret = 'secret phrase'; // sync this with the server backend
//
// afterwards, uncomment this:
/*
const grafana = true;
import { urlPrefix, secret } from './grafanaconfig.js';
*/
// and comment this:
// /*
const grafana = false;
// */

let logs = [];
const maxLogLength = 10;

let grafanaLogs = {};
const grafanaInterval = 5; // 5s
let grafanaStatus = ' NA';

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	if (fuckers.length === 0) {
		ns.tprint('no modules loaded!');
		return;
	}

	for (const fucker of fuckers) {
		if (fucker.init) await fucker.init(ns);
	}

	let t = 0;
	let grafanaTimer = 0;

	ns.tail();

	while (true) {
		let tickStart = Date.now();
		let stats = [];
		let times = [];

		for (const fucker of fuckers) {
			if (!fucker.loop) continue;
			if (t < (fucker.waitUntil || 0)) continue;
			let [eLog, eStats, eTime, eGrafana] = await fucker.loop(ns);

			logs.push(...((eLog || []).map(l => fucker.prefix + ' ' + l)));
			if (eTime) times.push(eTime);

			fucker.waitUntil = t + eTime;
			fucker.stats = eStats;

			if (eGrafana) {
				for (const k of Object.keys(eGrafana)) {
					grafanaLogs[k] = eGrafana[k];
				}
			}
		}
		for (const fucker of fuckers) {
			if (fucker.stats) stats.push(...fucker.stats);
		}

		if (logs.length > maxLogLength) logs = logs.slice(-maxLogLength);

		if (grafana && !secret && !urlPrefix) {
			grafanaStatus = ' NOINFO';
		} else if (grafana && grafanaTimer > grafanaInterval * 1000) {
			grafanaStatus = '';

			grafanaTimer -= grafanaInterval * 1000;
			let totalLogs = Object.keys(grafanaLogs).length;
			let success = 0;
			for (const [endpoint, data] of Object.entries(grafanaLogs)) {
				data.secret = secret;
				let urlString = `${urlPrefix}${endpoint}?${Object.entries(data).map(e => `${e[0]}=${e[1]}`).join('&')}`;
				let resp = await ns.wget(urlString, '_.txt');

				if (!resp) {
					grafanaStatus += ' ERR';
					continue;
				}

				let respCode = await ns.read('_.txt');
				if (respCode[0] === '4' || respCode[0] === '5') { // 4xx, 5xx errors
					grafanaStatus += ' ' + respCode;
					continue;
				}

				success++;
			}

			ns.rm('_.txt');

			if (success === totalLogs) {
				grafanaStatus = ' OK';
			}
		}

		let footer = 'fuckerdaemon | (ↄ) Jill "oatmealine" Monoids 2021';
		if (grafana) {
			footer = `fuckerdamon | grafana:${grafanaStatus} | (ↄ) Jill "oatmealine" Monoids 2021`;
		}

		ns.clearLog();
		ns.print(`${logs.join('\n')}

${stats.join('\n')}
${footer}`);

		let tickDuration = Date.now() - tickStart;

		const sleepTime = times.reduce((a, b) => Math.min(a, b), 10000) || 0;
		await ns.sleep(Math.max(sleepTime - tickDuration, 0) + 100); // to prevent weird timing jank
		t += sleepTime;
		grafanaTimer += sleepTime;
	}
}
