// everythingfucker.js
// usage: simply run it
// its recommended to use fuckerdaemon.js, but it also runs standalone at a bigger amount of ram
// takes up 8.35GB of ram, automatically hacks any servers that are hackable, tries to avoid unnecessary calls with lots of caching
// you may want to mess with the constants if youre getting bad results!

// constants!
const neverScan = ['home'];
const backdoorServers = ['fulcrumassets', 'CSEC', 'avmnite-02h', 'I.I.I.I', 'run4theh111z']
const updateInterval = 250;
const minChance = 0.55; // min chance before proceeding to grow/hack
const maxLogLength = 10;
const prioritizeTimeBy = 0.04; // how much to prioritize time in ordering servers [0.0 : 1.0]
const maxServerChars = 16;

// scanning recursion-avoiding stuff
let memory = [];
let oldexes = [];
let requiredLevels = new Set();
let oldlevel = 0;
let ignore = [];

// caches
// global caches ( never reset )
let scanCache = {};
let moneyMaxCache = {};
let scriptMemoryCache = {};
let maxRamCache = {};
let requiredHackingLevel = {};
let securityMinLevelCache = {};
// temporary caches ( reset on tick start )
let moneyAvailableCache = {};
let hackChanceCache = {};
let hackTimeCache = {};
let securityLevelCache = {};
let playerCache;
let growthCache = {};

// scheduling! :)
// [hostname, changeBy, when, scheduledAt]
let securityLevelScheduled = [];
let moneyAvailableScheduled = [];

// misc
let processesPerTick = 0;
let logs = [];
let t = 0; // for scheduling
let lastt = Date.now();

function scan(ns, servers) {
	let lServers = [];
	let rServers = [];
	for (const server of servers) {
		if (neverScan.includes(server)) continue;
		if (memory.includes(server)) continue;
		memory.push(server);

		let rootAccess = ns.hasRootAccess(server);
		if (!rootAccess) {
			rServers.push(server);
		} else {
			lServers.push(server);
		}
		let res = scan(ns, scanCache[server] || (scanCache[server] = ns.scan(server)));
		lServers.push(...res[0]);
		rServers.push(...res[1]);
	}

	return [lServers, rServers]; // rooted, unrooted
}

function doScan(ns) {
	memory = [];
	return scan(ns, ns.scan());
}

function getExes(ns) {
	let exes = [];
	for (let hack of ['brutessh', 'ftpcrack', 'relaysmtp', 'sqlinject', 'httpworm']) {
		if (ns.fileExists(hack + '.exe')) exes.push(hack)
	}
	return exes;
}

function nukeAllNukable(ns, exes) {
	while (true) {
		let accessible = doScan(ns)[1];
		let couldHaveLevel = accessible
			.filter(s => !ignore.includes(s))
			.filter(s => ns.getServerNumPortsRequired(s) <= exes.length);

		let bruteforcable = couldHaveLevel
			.filter(s => getRequiredHackingLevel(ns, s) <= ns.getPlayer().hacking)

		for (const s of couldHaveLevel.filter(s => getRequiredHackingLevel(ns, s) > ns.getPlayer().hacking)) {
			requiredLevels.add(getRequiredHackingLevel(ns, s));
		}

		if (bruteforcable.length === 0) {
			ns.tprint(`no hackable servers found (out of ${accessible.length} accessible), continuing`);
			break;
		}

		ns.tprint(`found ${bruteforcable.length} hackable servers and ${accessible.length - bruteforcable.length} additional accessible servers`);

		for (const s of bruteforcable) {
			let ports = ns.getServerNumPortsRequired(s);
			let portsOpen = 0;

			ns.tprint(`${s}: attempting to open ${ports} ports`);

			if (exes.includes('brutessh') && portsOpen < ports) { portsOpen++; ns.brutessh(s) };
			if (exes.includes('ftpcrack') && portsOpen < ports) { portsOpen++; ns.ftpcrack(s) };
			if (exes.includes('relaysmtp') && portsOpen < ports) { portsOpen++; ns.relaysmtp(s) };
			if (exes.includes('sqlinject') && portsOpen < ports) { portsOpen++; ns.sqlinject(s) };
			if (exes.includes('httpworm') && portsOpen < ports) { portsOpen++; ns.httpworm(s) };

			if (portsOpen < ports) {
				ns.tprint(`${s}: failed to get enough ports; leaving`);
				ignore.push(s);
				continue;
			}

			ns.nuke(s);
			ns.tprint(`${s}: nuked`);
			if (backdoorServers.includes(s)) ns.tprint(`${s}: you may want to connect to this server and run backdoor! special things happen`);
		}
	}
}

// formulas.js moment

function calculateIntelligenceBonus(intelligence, weight = 1) {
	return 1 + (weight * Math.pow(intelligence, 0.8)) / 600;
}

/** @param {NS} ns **/
function hackTime(ns, hostname) {
	const difficultyMult = getRequiredHackingLevel(ns, hostname) * getSecurityLevel(ns, hostname);
	const player = getPlayer(ns);

	const baseDiff = 500;
	const baseSkill = 50;
	const diffFactor = 2.5;
	let skillFactor = diffFactor * difficultyMult + baseDiff;
	skillFactor /= player.hacking + baseSkill;

	const hackTimeMultiplier = 5;
	const hackingTime =
		(hackTimeMultiplier * skillFactor) /
		(player.hacking_speed_mult * calculateIntelligenceBonus(player.intelligence, 1));

	return hackingTime * 1000;
}
function hackChance(ns, hostname) {
	const player = getPlayer(ns);

	const hackFactor = 1.75;
	const difficultyMult = (100 - getSecurityLevel(ns, hostname)) / 100;
	const skillMult = hackFactor * player.hacking;
	const skillChance = (skillMult - getRequiredHackingLevel(ns, hostname)) / skillMult;
	const chance =
		skillChance * difficultyMult * player.hacking_chance_mult * calculateIntelligenceBonus(player.intelligence, 1);
	if (chance > 1) {
		return 1;
	}
	if (chance < 0) {
		return 0;
	}

	return chance;
}
function hackPercent(ns, hostname) {
	const player = getPlayer(ns);

	const balanceFactor = 240;

	const difficultyMult = (100 - getSecurityLevel(ns, hostname)) / 100;
	const skillMult = (player.hacking - (getRequiredHackingLevel(ns, hostname) - 1)) / player.hacking;
	const percentMoneyHacked = (difficultyMult * skillMult * player.hacking_money_mult) / balanceFactor;
	if (percentMoneyHacked < 0) {
		return 0;
	}
	if (percentMoneyHacked > 1) {
		return 1;
	}

	return percentMoneyHacked;
}
function growPercent(ns, hostname, threads, cores = 1) {
	const p = getPlayer(ns);
	const numServerGrowthCycles = Math.max(Math.floor(threads), 0);

	//Get adjusted growth rate, which accounts for server security
	const growthRate = /*CONSTANTS.ServerBaseGrowthRate*/ 1.03;
	let adjGrowthRate = 1 + (growthRate - 1) / getSecurityLevel(ns, hostname);
	if (adjGrowthRate > /*CONSTANTS.ServerMaxGrowthRate*/ 1.0035) {
		adjGrowthRate = /*CONSTANTS.ServerMaxGrowthRate*/ 1.0035;
	}

	//Calculate adjusted server growth rate based on parameters
	const serverGrowthPercentage = getGrowth(ns, hostname) / 100;
	const numServerGrowthCyclesAdjusted =
		numServerGrowthCycles * serverGrowthPercentage;

	//Apply serverGrowth for the calculated number of growth cycles
	const coreBonus = 1 + (cores - 1) / 16;
	return Math.pow(adjGrowthRate, numServerGrowthCyclesAdjusted * p.hacking_grow_mult * coreBonus);
}

// stolen from the bitburner source code

// so funny story right
// we _could_ use cpu cores, and itd be more accurate
// but getting the cpu cores on a server requires 2gb of ram
// which simply is Way Too Fucking Much
// so we dont
// but we could
// this game man
function getWeakenAmount(threads, cpuCores = 1) {
	return 0.05 * threads * cpuCores;
}
function numCycleForGrowth(ns, hostname, growth, cores = 1) {
	const p = getPlayer(ns);

	let ajdGrowthRate = 1 + (/*CONSTANTS.ServerBaseGrowthRate*/ 1.03 - 1) / getSecurityLevel(ns, hostname);
	if (ajdGrowthRate > /*CONSTANTS.ServerMaxGrowthRate*/ 1.0035) {
		ajdGrowthRate = /*CONSTANTS.ServerMaxGrowthRate*/ 1.0035;
	}

	const serverGrowthPercentage = getGrowth(ns, hostname) / 100;

	const coreBonus = 1 + (cores - 1) / 16;
	const cycles =
		Math.log(growth) /
		(Math.log(ajdGrowthRate) *
			p.hacking_grow_mult *
			serverGrowthPercentage *
			coreBonus);

	return cycles;
}
function getGrowFortifyAmount(ns, hostname, growth, threads, cores = 1) {
	let usedCycles = numCycleForGrowth(ns, hostname, growth, cores);
	usedCycles = Math.min(Math.max(0, Math.ceil(usedCycles)), threads);
	return 2 * /*CONSTANTS.ServerFortifyAmount*/ 0.002 * usedCycles;
}
function getHackFortifyAmount(ns, hostname, hacked, threads) {
	let maxThreadNeeded = Math.ceil((1 / hacked) * (getMoneyAvailable(ns, hostname) / getMaxMoneyAvailable(ns, hostname)));
	if (isNaN(maxThreadNeeded)) {
		// Server has a 'max money' of 0 (probably). We'll set this to an arbitrarily large value
		maxThreadNeeded = 1e6;
	}
	return /*CONSTANTS.ServerFortifyAmount*/ 0.002 * Math.min(threads, maxThreadNeeded);
}


// cached function variants to avoid || () = type nonsense
function getPlayer(ns) {
	return playerCache || (playerCache = ns.getPlayer());
}
function getGrowth(ns, hostname) {
	return growthCache[hostname] || (growthCache[hostname] = ns.getServerGrowth(hostname));
}
function getMinSecurityLevel(ns, hostname) {
	return securityMinLevelCache[hostname] || (securityMinLevelCache[hostname] = ns.getServerMinSecurityLevel(hostname));
}
let oldLevel = {};
function getSecurityLevel(ns, hostname) {
	if (securityLevelCache[hostname]) return securityLevelCache[hostname];
	let level = (securityLevelCache[hostname] = ns.getServerSecurityLevel(hostname));
	if (oldLevel[hostname] !== level) {
		oldLevel[hostname] = level;
		securityLevelScheduled = securityLevelScheduled.filter(l => l[0] !== hostname);
	}
	return level + Math.max(
		securityLevelScheduled
			.filter(l => hostname === l[0])
			.map(l => l[1] * Math.max(Math.min((t - l[3]) / (l[2] - l[3]), 1), 0))
			.reduce((p, n) => p + n, 0) || 0,
		getMinSecurityLevel(ns, hostname)
	);
}
function getRequiredHackingLevel(ns, hostname) {
	return requiredHackingLevel[hostname] || (requiredHackingLevel[hostname] = ns.getServerRequiredHackingLevel(hostname));
}
let oldMoney = {};
function getMoneyAvailable(ns, hostname) {
	if (moneyAvailableCache[hostname]) return moneyAvailableCache[hostname];
	let money = (moneyAvailableCache[hostname] = ns.getServerMoneyAvailable(hostname));
	if (oldMoney[hostname] !== money) {
		oldMoney[hostname] = money;
		moneyAvailableScheduled = moneyAvailableScheduled.filter(l => l[0] !== hostname);
	}
	return money + Math.min(
		Math.max(
			moneyAvailableScheduled
				.filter(l => hostname === l[0])
				.map(l => l[1] * Math.max(Math.min((t - l[3]) / (l[2] - l[3]), 1), 0))
				.reduce((p, n) => p + n, 0) || 0,
			0
		),
		getMaxMoneyAvailable(ns, hostname)
	);
}
function getMaxMoneyAvailable(ns, hostname) {
	return moneyMaxCache[hostname] || (moneyMaxCache[hostname] = ns.getServerMaxMoney(hostname));
}
function getHackChance(ns, hostname) {
	return hackChanceCache[hostname] || (hackChanceCache[hostname] = hackChance(ns, hostname));
}
function getScriptRam(ns, script) {
	return scriptMemoryCache[script] || (scriptMemoryCache[script] = ns.getScriptRam(script));
}
function getMaxRam(ns, hostname) {
	return maxRamCache[hostname] || (maxRamCache[hostname] = ns.getServerMaxRam(hostname));
}
function getHackTime(ns, hostname) {
	return hackTimeCache[hostname] || (hackTimeCache[hostname] = hackTime(ns, hostname));
}
function getWeakenTime(ns, hostname) {
	return getHackTime(ns, hostname) * 4;
}
function getGrowTime(ns, hostname) {
	return getHackTime(ns, hostname) * 3.2;
}

function formatTime(ms) {
	let minutes = 0;
	let secs = ms / 1000;

	minutes += secs / 60;
	secs = secs % 60;

	return `${minutes <= 0 ? `${Math.floor(minutes)}m ` : ''}${secs.toPrecision(3)}`;
}

function mix(a, b, x) {
	return a * (1 - x) + b * x;
}

let avgThreadAmount = 1;
/** @param {NS} ns **/
export async function loop(ns) {
	t += Date.now() - lastt;
	lastt = Date.now();

	let log = [];
	let stats = [];

	// reset caches
	moneyAvailableCache = {};
	hackChanceCache = {};
	hackTimeCache = {};
	securityLevelCache = {};
	growthCache = {};
	playerCache = undefined;

	// clean 10min old scheduled changes
	securityLevelScheduled = securityLevelScheduled.filter(l => l[3] > (t - 600000));
	moneyAvailableScheduled = moneyAvailableScheduled.filter(l => l[3] > (t - 600000));

	const purchasedServers = ns.getPurchasedServers();

	for (const s of purchasedServers) {
		if (maxRamCache[s]) delete maxRamCache[s];
	}

	let smallestTimeToWait = updateInterval;

	// hackfucker.js portion
	let exes = getExes(ns);
	let playerLevel = getPlayer(ns).hacking;
	if (oldexes.length !== exes.length || (oldlevel < playerLevel && requiredLevels.has(playerLevel))) {
		if (oldexes.length > 0 && oldexes.length !== exes.length) ns.tprint('owo???????? new exe detected lets go');
		if (oldlevel !== 0 && oldlevel < playerLevel) ns.tprint('player has levelled up lets go');
		log.push('running hack check');
		ignore = [];
		nukeAllNukable(ns, exes);
	}
	oldexes = exes;
	oldlevel = playerLevel;

	// crawlfucker.js portion
	let res = doScan(ns);
	let rooted = res[0];
	let sorted = rooted
		.filter(s => getMaxMoneyAvailable(ns, s) > 0) // avoid servers with no money at all
		.sort((s2, s1) =>
			getMaxMoneyAvailable(ns, s1) * hackPercent(ns, s1) * (getHackTime(ns, s1) * prioritizeTimeBy + (1 - prioritizeTimeBy)) -
			getMaxMoneyAvailable(ns, s2) * hackPercent(ns, s2) * (getHackTime(ns, s2) * prioritizeTimeBy + (1 - prioritizeTimeBy))
		);

	let totalStartedScripts = 0;
	let totalRunningScripts = 0;

	let ranWeaken = 0;
	let ranGrow = 0;
	let ranHack = 0;
	let threadCounts = [];

	let rootedPadAmt = rooted.reduce((s1, s2) => { return Math.max(s1 || 0, s2.length || 0) }, 0);
	let commandPadAmt = 6; // weaken is 6 chars long
	let sortedPadAmt = sorted.reduce((s1, s2) => { return Math.max(s1 || 0, s2.length || 0) }, 0);

	rootedPadAmt = Math.min(rootedPadAmt, maxServerChars);
	sortedPadAmt = Math.min(sortedPadAmt, maxServerChars);

	for (const fromServer of rooted) {
		if (!ns.fileExists('grow.script', fromServer))
			await ns.scp('grow.script', 'home', fromServer);
		if (!ns.fileExists('hack.script', fromServer))
			await ns.scp('hack.script', 'home', fromServer);
		if (!ns.fileExists('weaken.script', fromServer))
			await ns.scp('weaken.script', 'home', fromServer);

		let servIndex = 0;
		let scriptsRan = 0;
		let loopedAround = false;
		while (true) {
			let targetServer = sorted[servIndex];
			servIndex++;
			if (servIndex > sorted.length && !loopedAround) {
				loopedAround = true;
				servIndex = 0;
				targetServer = sorted[servIndex];
			}
			if (!targetServer) break;

			const hackChance = getHackChance(ns, targetServer);
			const minMoneyAmt = Math.min(hackPercent(ns, targetServer), 1) * getMaxMoneyAvailable(ns, targetServer);

			let command;
			let time;
			if (hackChance < minChance && getMinSecurityLevel(ns, targetServer) !== getSecurityLevel(ns, targetServer)) {
				command = 'weaken.script';
				time = getWeakenTime(ns, targetServer);
			} else if (getMoneyAvailable(ns, targetServer) < minMoneyAmt) {
				command = 'grow.script';
				time = getGrowTime(ns, targetServer);
			} else {
				command = 'hack.script';
				time = getHackTime(ns, targetServer);
			}

			if (ns.isRunning(command, fromServer, targetServer)) continue;

			let scriptram = getScriptRam(ns, command);
			let availram = getMaxRam(ns, fromServer) - ns.getServerUsedRam(fromServer);
			let threads = Math.floor(availram / scriptram);
			if (scriptram > availram) break;

			// optimize the amount of script calls
			// to avoid redundant calls
			if (command === 'weaken.script') {
				while (threads > 0 && getMinSecurityLevel(ns, targetServer) > getSecurityLevel(ns, targetServer) - getWeakenAmount(threads)) {
					threads--;
				}
			}
			if (command === 'hack.script') {
				while (threads > 0 && hackPercent(ns, targetServer) * threads > (getMoneyAvailable(ns, targetServer) / getMaxMoneyAvailable(ns, targetServer))) {
					threads--;
				}
			}
			if (command === 'grow.script') {
				while (threads > 0 && growPercent(ns, targetServer, threads) > 1 - (getMoneyAvailable(ns, targetServer) / getMaxMoneyAvailable(ns, targetServer))) {
					threads--;
				}
			}
			if (threads <= 0 && !loopedAround) continue;
			if (threads === 0) threads++;

			// time /= threads; // that's not even true

			const pid = ns.exec(command, fromServer, threads, targetServer);
			if (pid === 0) break;

			// schedule stuff! :)
			switch (command) {
				case 'weaken.script':
					securityLevelScheduled.push([
						targetServer,
						-getWeakenAmount(threads),
						// we schedule this earlier by the hack time since the weaken will apply once the hack is complete
						// Hash Tag Max Efficiency
						// https://media.discordapp.net/attachments/415207508303544323/924114194817765466/Concept_of_Batches.png
						t + (getWeakenTime(ns, targetServer) - getHackTime(ns, targetServer) + 100),
						t
					]);
					break;
				case 'grow.script':
					moneyAvailableScheduled.push([
						targetServer,
						(getMoneyAvailable(ns, targetServer) * growPercent(ns, targetServer, threads)) - getMoneyAvailable(ns, targetServer),
						t + (getGrowTime(ns, targetServer) - getHackTime(ns, targetServer) + 100),
						t
					]);
					securityLevelScheduled.push([
						targetServer,
						getGrowFortifyAmount(ns, targetServer, growPercent(ns, targetServer, threads), threads),
						t + (getGrowTime(ns, targetServer) - getWeakenTime(ns, targetServer) + 100),
						t
					]);
					break;
				case 'hack.script':
					securityLevelScheduled.push([
						targetServer,
						getHackFortifyAmount(ns, targetServer, hackPercent(ns, targetServer) * threads, threads),
						t + (getHackTime(ns, targetServer) - getWeakenTime(ns, targetServer) + 100),
						t
					]);
					moneyAvailableScheduled.push([
						targetServer,
						(getMoneyAvailable(ns, targetServer) * hackPercent(ns, targetServer) * threads) - getMoneyAvailable(ns, targetServer),
						t + (getGrowTime(ns, targetServer) - getHackTime(ns, targetServer) + 100),
						t
					]);
					break;
			}

			smallestTimeToWait = Math.min(smallestTimeToWait, time);

			command = command.split('.')[0];
			let pFromServer = fromServer.padEnd(rootedPadAmt, ' ').slice(0, rootedPadAmt);
			let pCommand = command.padEnd(commandPadAmt, ' ');
			let pTargetServer = targetServer.padEnd(sortedPadAmt, ' ').slice(0, sortedPadAmt);
			let pThreads = threads.toString().padEnd(5, ' ');
			log.push(`${pFromServer}: ${pCommand} ${pTargetServer} t=${pThreads} | est time ${formatTime(time)}s`);
			scriptsRan++;
		}

		//if (scriptsRan > 0) log.push(`started ${scriptsRan} scripts on ${fromServer}`);

		// analytics bs
		const processes = ns.ps(fromServer);
		for (const p of processes) {
			threadCounts.push(p.threads);
			if (p.filename === 'weaken.script') {
				ranWeaken++;
			} else if (p.filename === 'grow.script') {
				ranGrow++;
			} else if (p.filename === 'hack.script') {
				ranHack++;
			}
		}

		totalRunningScripts += ns.ps(fromServer).length;
		totalStartedScripts += scriptsRan;
	}

	let avgThreadCount = threadCounts.reduce((p, c) => p + c, 0) / threadCounts.length;
	avgThreadAmount = avgThreadCount; // for use in next tick
	processesPerTick = Math.max(mix(processesPerTick, 0, smallestTimeToWait / 1000 * 0.25), totalStartedScripts);

	stats.push(`${totalRunningScripts} processes running on ${rooted.length} servers hacking ${sorted.length} servers out of ${res[0].length + res[1].length} known`);
	stats.push(`${totalStartedScripts} processes (${Math.floor(totalStartedScripts / totalRunningScripts * 1000) / 10}%) started this tick`);
	stats.push(`${ranHack} hacking, ${ranWeaken} weakening, ${ranGrow} growing; ${securityLevelScheduled.length} + ${moneyAvailableScheduled.length} changes scheduled`);
	stats.push(`${Math.floor(avgThreadCount * 10) / 10} threads avg, ${Math.floor(totalRunningScripts / sorted.length * 10) / 10} processes/server, ${Math.floor(processesPerTick / (smallestTimeToWait / 1000) * 100) / 100} processes/s`);

	return [log, stats, smallestTimeToWait, {
		'/': {
			processes: totalRunningScripts,
			hacking: ranHack,
			weakening: ranWeaken,
			growing: ranGrow
		},
		'/servers': {
			known: res[1].length,
			rooted: res[0].length - purchasedServers.length - sorted.length,
			owned: purchasedServers.length,
			profitable: sorted.length
		},
		'/money': {
			money: getPlayer(ns).money
		}
	}];
}

export async function initialize(ns) {
	await ns.write('grow.script', 'grow(args)', 'w');
	await ns.write('hack.script', 'hack(args)', 'w');
	await ns.write('weaken.script', 'weaken(args)', 'w');
}

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');
	await initialize(ns);

	while (true) {
		ns.clearLog();

		let [log, stats, time] = await loop(ns);
		logs.push(...log);
		if (logs.length > maxLogLength) logs = logs.slice(-maxLogLength);
		ns.print(`${logs.join('\n')}

${stats.join('\n')}
everythingfucker.js | (ↄ) Jill "oatmealine" Monoids 2021`);

		await ns.sleep(time + 100); // to prevent weird timing jank
	}
}

