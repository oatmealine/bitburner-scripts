// hackfucker.js
// uasge: simply run it
// !!!! deprecated in favor of everythingfucker.js which includes this, except better

// recursively scans and hacks any and all available servers, then exits

/** @param {NS} ns **/
export async function main(ns) {
	let memory = [];
	let ignore = [];

    function scan(servers) {
		let rServers = [];
		for (const server of servers) {
			if (memory.includes(server)) continue;
			memory.push(server);

			let rootAccess = ns.hasRootAccess(server);
			if (!rootAccess) {
				rServers.push(server);
			} else {
				rServers.push(...scan(ns.scan(server)));
			}
		}

		return rServers;
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

	while(true) {
		const exes = getExes();
		let accessible = doScan();
		let bruteforcable = accessible
			.filter(s => ns.getServerNumPortsRequired(s) <= exes.length)
			.filter(s => ns.getServerRequiredHackingLevel(s) <= ns.getPlayer().hacking)
			.filter(s => !ignore.includes(s));

		if (bruteforcable.length === 0) {
			ns.tprint(`no hackable servers found (out of ${accessible.length} accessible), exiting!`);
			break;
		}

		ns.tprint(`found ${bruteforcable.length} hackable servers and ${accessible.length - bruteforcable.length} additional accessible servers`);

		for (const s of bruteforcable) {
			let ports = ns.getServerNumPortsRequired(s);
			let portsOpen = 0;

			ns.tprint(`${s}: attempting to open ${ports} ports`);

			if (exes.includes('brutessh') && portsOpen < ports) {portsOpen++; ns.brutessh(s)};
			if (exes.includes('ftpcrack') && portsOpen < ports) {portsOpen++; ns.ftpcrack(s)};
			if (exes.includes('relaysmtp') && portsOpen < ports) {portsOpen++; ns.relaysmtp(s)};
			if (exes.includes('sqlinject') && portsOpen < ports) {portsOpen++; ns.sqlinject(s)};
			if (exes.includes('httpworm') && portsOpen < ports) {portsOpen++; ns.httpworm(s)};

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
