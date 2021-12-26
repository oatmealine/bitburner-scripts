// hacknetfucker.js
// usage: simply run it
// upgrades available hacknet nodes (only available ones!) to produce the ideal cash per second only using your nodes' production
// doesnt work with the servers! whatever those are ... however i might make a seperate script that does whenever i get to that

/** @param {NS} ns **/
export async function main(ns) {
	const refreshTimer = 50000;
	const hacknet = ns.hacknet;

	while (true) {
		let allowance = ns.getPlayer().money * 0.1;

		let moneyrate = 0;
		for (let i = 0; i < hacknet.numNodes(); i++) {
			moneyrate += hacknet.getNodeStats(i).production;
		}

		allowance = Math.min(allowance, moneyrate * (refreshTimer / 1000));

		let maxUpgrade = 0;
		let maxUpgradeIndex;
		let maxUpgradeType;
		let maxUpgradeAmt;
		for (let i = 0; i < hacknet.numNodes(); i++) {
			const stats = hacknet.getNodeStats(i);
			let upgrades = [];

			let upgradeamt = 0;
			while (hacknet.getRamUpgradeCost(i, upgradeamt) < allowance) {
				upgradeamt++;
			}
			upgrades.push([stats.production * 0.07 * (upgradeamt - 1), 'ram', upgradeamt - 1]);

			upgradeamt = 0;
			while (hacknet.getCoreUpgradeCost(i, upgradeamt) < allowance) {
				upgradeamt++;
			}
			upgrades.push([stats.production * ((stats.cores + 5) / (stats.cores + 4) - 1) * (upgradeamt - 1), 'core', upgradeamt - 1]);

			upgradeamt = 0;
			while (hacknet.getLevelUpgradeCost(i, upgradeamt) < allowance) {
				upgradeamt++;
			}
			upgrades.push([(stats.production * ((stats.level + 1) / stats.level - 1)) * (upgradeamt - 1), 'level', upgradeamt - 1]);

			let best = upgrades.reduce((p, c) => p[0] > c[0] ? p : c);
			if (best[0] > maxUpgrade) {
				maxUpgrade = best[0];
				maxUpgradeIndex = i;
				maxUpgradeType = best[1];
				maxUpgradeAmt = best[2];
			}
		}

		ns.print(`best upgrade with an allowance of ${allowance.toLocaleString()}\$ is ${maxUpgradeAmt} ${maxUpgradeType} upgrades for hacknet-node-${maxUpgradeIndex}`);

		let currentMoney = ns.getPlayer().money;
		switch (maxUpgradeType) {
			case 'ram':
				hacknet.upgradeRam(maxUpgradeIndex, maxUpgradeAmt);
				break;
			case 'core':
				hacknet.upgradeCore(maxUpgradeIndex, maxUpgradeAmt);
				break;
			case 'level':
				hacknet.upgradeLevel(maxUpgradeIndex, maxUpgradeAmt);
				break;
		}
		ns.print(`spent ${Math.floor(currentMoney - ns.getPlayer().money).toLocaleString()}\$`);

		await ns.sleep(refreshTimer);
	}
}
