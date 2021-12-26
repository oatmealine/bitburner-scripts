// serverfucker.js
// usage: simply run it
// buys servers using half of your cash per second and upgrades them whenever possible

/** @param {NS} ns **/
export async function main(ns) {
	let lastMoney;
	const prefix = 'onionline';

	ns.disableLog('ALL');

	while (true) {
		const allowance = lastMoney ? (ns.getPlayer().money - lastMoney) * 50 / 2 : ns.getPlayer().money / 4;
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
				ns.print(`deleted ${worstServer} for being bad (only ${worstServerRam}GB?????) in favor of ${Math.pow(2, bestPurchasableRam)}GB server`);
				ns.purchaseServer(prefix, Math.pow(2, bestPurchasableRam));
			} else {
				ns.print(`best server i can buy with allowance is ${Math.pow(2, bestPurchasableRam)}GB, yet my worst server is ${worstServerRam}GB`);
			}
		} else {
			let hostname = ns.purchaseServer(prefix, Math.pow(2, bestPurchasableRam));
			ns.print(`purchased ${hostname} (${Math.pow(2, bestPurchasableRam)}GB server)`);
		}

		lastMoney = ns.getPlayer().money;
		await ns.sleep(50000);
	}
}
