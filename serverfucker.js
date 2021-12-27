// serverfucker.js
// usage: simply run it
// its recommended to use fuckerdaemon.js, but it also runs standalone at a bigger amount of ram
// uses up 9.85GB of ram
// buys servers using your cash per second and upgrades them whenever possible
// uses a random prefix from the prefixes array, avoids duplicates

let lastMoney;
const prefixes = ['onionline', 'nestea', 'firepit', 'laserjet-printer', 'ummu', 'oat.zone', 'monoids-in-the-category-of-endofunctors', 'catboymaid', 'she', 'bababooey', 'gaming', 'xbox', 'razer-gaming-laptop-from-2010', 'transrights', 'unique-hostname', 'yop', 'peeesh', 'cocksauce', 'joemama', 'ghoul', 'mistress', 'oatmealbean', 'boatmealine', 'no-illegal-stuff-here-officer', 'instant-n00dles', 'sigma-grindset', 'federal-agents-outside-my-home', 'beep', 'github.com.oatmealine.bitburner-scripts', 'lol-lmao-lmfao-rofl-roflmao', 'deatj', 'anonymous-oatmeal-services', 'wife', 'chegg.com'];

const maxLogLength = 10;
let logs = [];

function getRandomHostname(ns) {
	for (let i = 0; i < 20; i++) {
		let hostname = prefixes[Math.floor(Math.random() * prefixes.length)];
		if (!ns.serverExists(hostname)) return hostname;
	}
}

function tryBuyServer(ns, ram) {
	let randHostname = getRandomHostname(ns);
	let hostname = ns.purchaseServer(randHostname, ram);
	if (!hostname) {
		return `! failed to purchase ${randHostname} (${ram}GB server)?!?!?!?!`;
	} else {
		return `+ purchased ${hostname} (${ram}GB server)`;
	}
}

export function loop(ns) {
	let log = [];

	const allowance = lastMoney ? Math.max(ns.getPlayer().money - lastMoney, 0) * 1.5 : ns.getPlayer().money / 4;
	log.push(`set allowance to ${Math.round(allowance).toLocaleString()}\$`);

	let bestPurchasableRam = 2;
	while (
		Math.pow(2, bestPurchasableRam) < ns.getPurchasedServerMaxRam() &&
		ns.getPurchasedServerCost(Math.pow(2, bestPurchasableRam)) < allowance
	) {
		//ns.print(`${Math.pow(2, bestPurchasableRam)}GB = ${ns.getPurchasedServerCost(Math.pow(2, bestPurchasableRam))}\$`);
		bestPurchasableRam++;
	}
	bestPurchasableRam--;
	let bestPurchasableRamSane = Math.pow(2, bestPurchasableRam);

	if (ns.getPurchasedServerCost(bestPurchasableRamSane) > allowance) {
		log.push(`can\'t buy any server with an allowance of ${allowance.toLocaleString()}\$`);
	} else if (ns.getPurchasedServers().length >= ns.getPurchasedServerLimit()) {
		let servers = ns.getPurchasedServers();
		let worstServer;
		let worstServerRam = Number.MAX_SAFE_INTEGER;
		for (const server of servers) {
			let ram = ns.getServerMaxRam(server);
			if (ram < worstServerRam) {
				worstServerRam = ram;
				worstServer = server;
			}
		}

		if (worstServerRam < bestPurchasableRamSane) {
			ns.killall(worstServer);
			ns.deleteServer(worstServer);
			log.push(`deleted ${worstServer} for being bad (only ${worstServerRam}GB?????)`);
			log.push(tryBuyServer(ns, bestPurchasableRamSane));
		} else {
			log.push(`cant buy better server with an allowance of ${allowance.toLocaleString()}\$`);
		}
	} else {
		log.push(tryBuyServer(ns, bestPurchasableRamSane));
	}

	lastMoney = ns.getPlayer().money;

	return [log, [], 50000];
}

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	while (true) {
		const [log, _, time] = loop(ns);
		logs.push(...log);
		ns.clearLog();
		if (logs.length > maxLogLength) logs = logs.slice(-maxLogLength);
		ns.print(logs.join('\n'));
		await ns.sleep(time);
	}
}
