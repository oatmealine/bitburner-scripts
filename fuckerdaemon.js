// fuckerdaemon.js
// acts as an auto-launcher for everythingfucker, serverfucker, hacknetfucker to reduce ram usage
// youre still able to run the individual files! its just not as efficient
// uses up 18.50GB with everything enabled

// if it gives you an error here, use fuckerfetcher.js
import { fuckers } from './config.js';

let logs = [];
const maxLogLength = 10;

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

	ns.tail();

	while (true) {
		let stats = [];
		let times = [];

		for (const fucker of fuckers) {
			if (!fucker.loop) continue;
			if (t < (fucker.waitUntil || 0)) continue;
			let [eLog, eStats, eTime] = await fucker.loop(ns);

			logs.push(...((eLog || []).map(l => fucker.prefix + ' ' + l)));
			if (eTime) times.push(eTime);

			fucker.waitUntil = t + eTime;
			fucker.stats = eStats;
		}
		for (const fucker of fuckers) {
			if (fucker.stats) stats.push(...fucker.stats);
		}

		if (logs.length > maxLogLength) logs = logs.slice(-maxLogLength);

		ns.clearLog();
		ns.print(`${logs.join('\n')}

${stats.join('\n')}
fuckerdaemon | (ↄ) Jill "oatmealine" Monoids 2021`);

		const sleepTime = times.reduce((a, b) => Math.min(a, b), 10000) || 0;
		await ns.sleep(sleepTime + 100); // to prevent weird timing jank
		t += sleepTime;
	}
}
