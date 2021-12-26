// everythingfucker.js
// usage: simply run it
// takes up 6.80GB of ram, automatically hacks any servers that are hackable, tries to avoid unnecessary calls with lots of caching
// you may want to mess with the constants if youre getting bad results!

/** @param {NS} ns **/
export async function main(ns) {
	// constants!
	const neverScan = ['home', 'darkweb'];
	const updateInterval = 500;
	const minChance = 0.55; // min chance before proceeding to grow/hack
	const minMoney = 400000; // min money on a server before proceeding to hack
	const minMoneyPercentage = 0.5; // caps out the above number to x * maxmoney
	const maxThreads = 32; // max threads to allocate per site to hack
	const maxLogLength = 10;
	const prioritizeTimeBy = 0.3; // how much to prioritize time in ordering servers [0.0 : 1.0]
	const maxServerChars = 16;

	// scanning recursion-avoiding stuff
	let memory = [];
	let oldexes = [];
	let oldlevel = 0;
	let ignore = [];

	// caches
	// global caches ( never reset )
	let scanCache = {};
	let moneyMaxCache = {};
	let scriptMemoryCache = {};
	let maxRamCache = {};
	// temporary caches ( reset on tick start )
	let moneyAvailableCache = {};
	let hackChanceCache = {};
	let hackTimeCache = {};
	let weakenTimeCache = {};
	let growTimeCache = {};

	// misc
	let processesPerTick = 0;
	let logs = [];

	function scan(servers) {
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
			let res = scan(scanCache[server] || (scanCache[server] = ns.scan(server)));
			lServers.push(...res[0]);
			rServers.push(...res[1]);
		}

		return [lServers, rServers]; // rooted, unrooted
	}

	function doScan() {
		memory = [];
		return scan(ns.scan());
	}

	function getExes() {
		let exes = [];
		for (let hack of ['brutessh', 'ftpcrack', 'relaysmtp', 'sqlinject', 'httpworm']) {
			if (ns.fileExists(hack + '.exe')) exes.push(hack)
		}
		return exes;
	}

	function nukeAllNukable(exes) {
		while (true) {
			let accessible = doScan()[1];
			let bruteforcable = accessible
				.filter(s => ns.getServerNumPortsRequired(s) <= exes.length)
				.filter(s => ns.getServerRequiredHackingLevel(s) <= ns.getPlayer().hacking)
				.filter(s => !ignore.includes(s));

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
			}
		}
	}

	// cached function variants to avoid || () = type nonsense
	function getMoneyAvailable(hostname) {
		return moneyAvailableCache[hostname] || (moneyAvailableCache[hostname] = ns.getServerMoneyAvailable(hostname));
	}
	function getMaxMoneyAvailable(hostname) {
		return moneyMaxCache[hostname] || (moneyMaxCache[hostname] = ns.getServerMaxMoney(hostname));
	}
	function getHackChance(hostname) {
		return hackChanceCache[hostname] || (hackChanceCache[hostname] = ns.hackAnalyzeChance(hostname));
	}
	function getScriptRam(script) {
		return scriptMemoryCache[script] || (scriptMemoryCache[script] = ns.getScriptRam(script));
	}
	function getMaxRam(hostname) {
		return maxRamCache[hostname] || (maxRamCache[hostname] = ns.getServerMaxRam(hostname));
	}
	function getHackTime(hostname) {
		return hackTimeCache[hostname] || (hackTimeCache[hostname] = ns.getHackTime(hostname));
	}
	function getWeakenTime(hostname) {
		return weakenTimeCache[hostname] || (weakenTimeCache[hostname] = ns.getWeakenTime(hostname));
	}
	function getGrowTime(hostname) {
		return growTimeCache[hostname] || (growTimeCache[hostname] = ns.getGrowTime(hostname));
	}

	function getAvgTime(hostname) {
		return (getHackTime(hostname) + getWeakenTime(hostname) + getGrowTime(hostname)) / 3;
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

	// initialize stuff
	await ns.write('grow.script', 'grow(args)', 'w');
	await ns.write('hack.script', 'hack(args)', 'w');
	await ns.write('weaken.script', 'weaken(args)', 'w');

	ns.disableLog('ALL');

	while (true) {
		ns.clearLog();

		// reset caches
		moneyAvailableCache = {};
		hackChanceCache = {};
		hackTimeCache = {};
		weakenTimeCache = {};
		growTimeCache = {};

		let smallestTimeToWait = updateInterval;

		// hackfucker.js portion
		let exes = getExes();
		if (oldexes.length !== exes.length || oldlevel < ns.getPlayer().hacking) {
			if (oldexes.length > 0 && oldexes.length !== exes.length) ns.tprint('owo???????? new exe detected lets go');
			if (oldlevel !== 0 && oldlevel < ns.getPlayer().hacking) ns.tprint('player has levelled up lets go');
			logs.push('running hack check');
			ignore = [];
			nukeAllNukable(exes);
		}
		oldexes = exes;
		oldlevel = ns.getPlayer().hacking;

		// crawlfucker.js portion
		let res = doScan();
		let rooted = res[0];
		let sorted = rooted
			.filter(s => getMaxMoneyAvailable(s) > 0) // avoid servers with no money at all
			.sort((s2, s1) =>
				getMaxMoneyAvailable(s1) * (getAvgTime(s1) * prioritizeTimeBy + (1 - prioritizeTimeBy)) -
				getMaxMoneyAvailable(s2) * (getAvgTime(s2) * prioritizeTimeBy + (1 - prioritizeTimeBy))
			);

		let totalStartedScripts = 0;
		let totalRunningScripts = 0;

		let ranWeaken = 0;
		let ranGrow = 0;
		let ranHack = 0;
		let threadCounts = [];

		let rootedPadAmt = rooted.reduce((s1, s2) => {return Math.max(s1 || 0, s2.length || 0)});
		let commandPadAmt = 6; // weaken is 6 chars long
		let sortedPadAmt = sorted.reduce((s1, s2) => {return Math.max(s1 || 0, s2.length || 0)});

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
			while (true) {
				const targetServer = sorted[servIndex];
				servIndex++;
				if (!targetServer) break;

				const hackChance = getHackChance(targetServer);
				const minMoneyAmt = Math.min(minMoney, minMoneyPercentage * getMaxMoneyAvailable(targetServer));

				let command;
				let time;
				if (hackChance < minChance) {
					command = 'weaken.script';
					time = getWeakenTime(targetServer);
				} else if (getMoneyAvailable(targetServer) < minMoneyAmt) { // penis
					command = 'grow.script';
					time = getGrowTime(targetServer);
				} else {
					command = 'hack.script';
					time = getHackTime(targetServer);
				}

				if (ns.isRunning(command, fromServer, targetServer)) continue;

				let scriptram = getScriptRam(command);
				let availram = getMaxRam(fromServer) - ns.getServerUsedRam(fromServer);
				let threads = Math.min(Math.floor(availram / scriptram), maxThreads);
				if (scriptram > availram) break;

				// time /= threads; // that's not even true

				const pid = ns.exec(command, fromServer, threads, targetServer);
				if (pid === 0) break;
				smallestTimeToWait = Math.min(smallestTimeToWait, time);

				command = command.split('.')[0];
				let pFromServer = fromServer.padEnd(rootedPadAmt, ' ').slice(0, rootedPadAmt);
				let pCommand = command.padEnd(commandPadAmt, ' ');
				let pTargetServer = targetServer.padEnd(sortedPadAmt, ' ').slice(0, sortedPadAmt);
				let pThreads = threads.toString().padEnd(maxThreads.toString().length, ' ');
				logs.push(` ${pFromServer}: ${pCommand} ${pTargetServer} t=${pThreads} | est time ${formatTime(time)}s`);
				scriptsRan++;
			}

			//if (scriptsRan > 0) logs.push(`started ${scriptsRan} scripts on ${fromServer}`);

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

		let avgThreadCount = threadCounts.reduce((p, c) => p + c) / threadCounts.length;
		processesPerTick = Math.max(mix(processesPerTick, 0, smallestTimeToWait / 1000 * 0.25), totalStartedScripts);

		if (logs.length > maxLogLength) logs = logs.slice(-maxLogLength);

		ns.print(`${logs.join('\n')}

${totalRunningScripts} processes running on ${rooted.length} servers hacking ${sorted.length} servers out of ${res[0].length + res[1].length} known
 ${totalStartedScripts} processes (${Math.floor(totalStartedScripts / totalRunningScripts * 1000) / 10}%) started this tick
 ${ranHack} hacking, ${ranWeaken} weakening, ${ranGrow} growing
 ${Math.floor(avgThreadCount * 10) / 10} threads avg, ${Math.floor(totalRunningScripts / sorted.length * 10) / 10} processes per server avg
 ${Math.floor(processesPerTick / (smallestTimeToWait / 1000) * 100) / 100} processes / s; waiting ${(smallestTimeToWait / 1000).toFixed(2)}s before next tick

everythingfucker.js | (ↄ) Jill "oatmealine" Monoids 2021`);

		await ns.sleep(smallestTimeToWait + 100); // to prevent weird timing jank
	}
}
