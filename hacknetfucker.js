// hacknetfucker.js
// usage: simply run it
// uses 6.10GB of ram
// its recommended to use fuckerdaemon.js, but it also runs standalone at a bigger amount of ram
// upgrades available hacknet nodes (only available ones!) to produce the ideal cash per second only using your nodes' production
// doesnt work with the servers! whatever those are ... however i might make a seperate script that does whenever i get to that

const refreshTimer = 50000;
const allowanceAmt = 0.2;

const maxLogLength = 10;
let logs = [];

function moneyGainRate(level, ram, cores, mult) {
  const gainPerLevel = 1.5;

  const levelMult = level * gainPerLevel;
  const ramMult = Math.pow(1.035, ram - 1);
  const coresMult = (cores + 5) / 6;
  return levelMult * ramMult * coresMult * mult;
}

/** @param {NS} ns **/
export function loop(ns) {
	const hacknet = ns.hacknet;
	let log = [];

	const nodes = hacknet.numNodes();

	let ram = 0;
	let core = 0;
	let levels = 0;

	let allowance = ns.getPlayer().money * allowanceAmt;
	let mult = ns.getPlayer().hacknet_node_money_mult

	let moneyrate = 0;
	for (let i = 0; i < nodes; i++) {
		const stats = hacknet.getNodeStats(i);
		moneyrate += stats.production;
		ram += stats.ram;
		core += stats.cores;
		levels += stats.level;
	}

	allowance = Math.min(allowance, moneyrate * (refreshTimer / 1000));

	let maxUpgrade = 0;
	let maxUpgradeIndex;
	let maxUpgradeType;
	let maxUpgradeAmt;
	for (let i = 0; i < nodes; i++) {
		const stats = hacknet.getNodeStats(i);
		let upgrades = [];

		let upgradeamt = 0;
		while (hacknet.getRamUpgradeCost(i, upgradeamt) < allowance && (stats.ram + upgradeamt) <= 64) {
			upgradeamt++;
		}
		upgradeamt--;
		upgrades.push([moneyGainRate(stats.level, stats.ram, stats.cores, mult + upgradeamt), 'ram', upgradeamt]);

		upgradeamt = 0;
		while (hacknet.getCoreUpgradeCost(i, upgradeamt) < allowance && (stats.cores + upgradeamt) <= 16) {
			upgradeamt++;
		}
		upgradeamt--;
		upgrades.push([moneyGainRate(stats.level, stats.ram, stats.cores + upgradeamt, mult), 'core', upgradeamt]);

		upgradeamt = 0;
		while (hacknet.getLevelUpgradeCost(i, upgradeamt) < allowance && (stats.level + upgradeamt) <= 200) {
			upgradeamt++;
		}
		upgradeamt--;
		upgrades.push([moneyGainRate(stats.level + upgradeamt, stats.ram, stats.cores, mult), 'level', upgradeamt]);

		let best = upgrades.reduce((p, c) => p[0] > c[0] ? p : c, [0]);
		if (best[0] > maxUpgrade) {
			maxUpgrade = best[0];
			maxUpgradeIndex = i;
			maxUpgradeType = best[1];
			maxUpgradeAmt = best[2];
		}
	}

	if (maxUpgrade !== 0 && maxUpgradeAmt !== 0) {
		log.push(`best upgrade with ${allowance.toLocaleString()}\$ is ${maxUpgradeAmt} ${maxUpgradeType} upgrades for hacknet-node-${maxUpgradeIndex}`);

		//let currentMoney = ns.getPlayer().money;
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
		//log.push(`spent ${Math.floor(currentMoney - ns.getPlayer().money).toLocaleString()}\$`);
	} else {
		log.push(`no upgrades available with ${allowance.toLocaleString()}\$`);
	}

	return [log, [`${nodes} hacknet nodes, avg: ${(levels / nodes).toFixed(2)} lvl ${(ram / nodes).toFixed(2)} GB ${(core / nodes).toFixed(2)} cores`], refreshTimer];
}

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	while (true) {
		const [log, stats, time] = loop(ns);
		logs.push(...log);
		ns.clearLog();
		if (logs.length > maxLogLength) logs = logs.slice(-maxLogLength);
		ns.print(logs.join('\n') + '\n\n' + stats.join('\n'));
		await ns.sleep(time);
	}
}
