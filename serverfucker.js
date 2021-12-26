// serverfucker.js
// usage: simply run it
// buys servers using your cash per second and upgrades them whenever possible
// uses a random prefix from the prefixes array, avoids duplicates
/** @param {NS} ns **/

export async function main(ns) {
	let lastMoney;
	const prefixes = ['onionline', 'nestea', 'firepit', 'laserjet-printer', 'ummu', 'oat.zone', 'monoids-in-the-category-of-endofunctors', 'catboymaid', 'she', 'bababooey', 'gaming', 'xbox', 'razer-gaming-laptop-from-2010', 'transrights', 'unique-hostname', 'yop', 'peeesh', 'cocksauce', 'joemama', 'ghoul', 'mistress', 'oatmealbean', 'boatmealine', 'no-illegal-stuff-here-officer', 'instant-n00dles', 'sigma-grindset', 'federal-agents-outside-my-home', 'beep', 'github.com.oatmealine.bitburner-scripts', 'lol-lmao-lmfao-rofl-roflmao', 'deatj', 'anonymous-oatmeal-services', 'wife', 'chegg.com'];

	ns.disableLog('ALL');

	function getRandomHostname() {
		for (let i = 0; i < 20; i++) {
			let hostname = prefixes[Math.floor(Math.random() * prefixes.length)];
			if (!ns.serverExists(hostname)) return hostname;
		}
	}

	while (true) {
		const allowance = lastMoney ? (ns.getPlayer().money - lastMoney) * 50 : ns.getPlayer().money / 4;
		ns.print(`set allowance to ${Math.round(allowance).toLocaleString()}\$`);

		let bestPurchasableRam = 2;
		while (
			Math.pow(2, bestPurchasableRam) < ns.getPurchasedServerMaxRam() &&
			ns.getPurchasedServerCost(Math.pow(2, bestPurchasableRam)) < allowance
		) {
			//ns.print(`${Math.pow(2, bestPurchasableRam)}GB = ${ns.getPurchasedServerCost(Math.pow(2, bestPurchasableRam))}\$`);
			bestPurchasableRam++;
		}
		bestPurchasableRam--;

		if (ns.getPurchasedServers().length >= ns.getPurchasedServerLimit()) {
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

			if (worstServerRam < Math.pow(2, bestPurchasableRam)) {
				ns.killall(worstServer);
				ns.deleteServer(worstServer);
				ns.print(`deleted ${worstServer} for being bad (only ${worstServerRam}GB?????)`);
				let hostname = ns.purchaseServer(getRandomHostname(), Math.pow(2, bestPurchasableRam));
				ns.print(`purchased ${hostname} (${Math.pow(2, bestPurchasableRam)}GB server)`);
			} else {
				ns.print(`best server i can buy with allowance is ${Math.pow(2, bestPurchasableRam)}GB, yet my worst server is ${worstServerRam}GB`);
			}
		} else {
			let hostname = ns.purchaseServer(getRandomHostname(), Math.pow(2, bestPurchasableRam));
			ns.print(`purchased ${hostname} (${Math.pow(2, bestPurchasableRam)}GB server)`);
		}

		lastMoney = ns.getPlayer().money;
		await ns.sleep(50000);
	}
}
