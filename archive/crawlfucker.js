// crawlfucker.js
// usage: simply run it
// !!!! deprecated in favor of everythingfucker.js which is a rewirte of this with added behavior and better code
// !!!! this is also like. the first script i wrote lol
// !!!! just dont use it

// hacks, weakens and grows all rooted servers in the most profitable way it can find

let memory = [];
let serverCache = {};
let scanCache = {};
let ramCache = {};
let unhackableMemory = [];

/** @param {NS} ns **/
export async function mainHacknet(ns) {
    const hacknet = ns.hacknet;
	let allowance = ns.getPlayer().money * 0.2;
    
    let moneyrate = 0;
	for (let i = 0; i < hacknet.numNodes(); i++) {
        moneyrate += hacknet.getNodeStats(i).production;
    }
    
    //allowance = Math.min(allowance, moneyrate * 50);

	let maxUpgrade = 0;
	let maxUpgradeIndex;
	let maxUpgradeType;
	let maxUpgradeAmt;
	for (let i = 0; i < hacknet.numNodes(); i++) {
		let upgrades = [];

		let upgradeamt = 0;
		while (hacknet.getRamUpgradeCost(i, upgradeamt) < allowance) {
			upgradeamt++;
		}
		upgrades.push([upgradeamt, 'ram', upgradeamt]);

		upgradeamt = 0;
		while (hacknet.getCoreUpgradeCost(i, upgradeamt) < allowance) {
			upgradeamt++;
		}
		upgrades.push([upgradeamt / 2, 'core', upgradeamt]);

		upgradeamt = 0;
		while (hacknet.getLevelUpgradeCost(i, upgradeamt) < allowance) {
			upgradeamt++;
		}
		upgrades.push([upgradeamt / 20, 'level', upgradeamt]);

		let best = upgrades.reduce((p, c) => p[0] > c[0] ? p : c);
		if (best[0] > maxUpgrade) {
			maxUpgrade = best[0];
			maxUpgradeIndex = i;
			maxUpgradeType = best[1];
			maxUpgradeAmt = best[2];
		}
	}

	ns.print(`best upgrade is index ${maxUpgradeIndex} type ${maxUpgradeType} amount ${maxUpgradeAmt}`);

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
	ns.print(`spent ${Math.floor(currentMoney - ns.getPlayer().money)}\$`);
}

/** @param {NS} ns **/
function filterAndSort(ns, servers) {
    return servers
        .filter(s => !memory.find(m => m.split('/').pop() === s))
        .filter(s => !unhackableMemory.includes(s))
        .map(s => {return {
            /*
            requiredHackingSkill:
                (serverCache[s] && serverCache[s].requiredHackingSkill)
                || ns.getServerRequiredHackingLevel(s),
            numOpenPortsRequired:
                (serverCache[s] && serverCache[s].numOpenPortsRequired)
                || ns.getServerNumPortsRequired(s),
            sshPortOpen: false, // asdgaskhjgbaekghnlbrjanekhlanehkljawekalkj
            */
            moneyAvailable:
                (serverCache[s] && serverCache[s].moneyAvailable)
                || ns.getServerMaxMoney(s),
            hasAdminRights: ns.hasRootAccess(s),
            hostname: s,
            minSecurityLevel: (serverCache[s] && serverCache[s].minSecurityLevel) || ns.getServerMinSecurityLevel(s),
            chance: ns.getServerSecurityLevel(s) >= (2 + (serverCache[s] && serverCache[s].minSecurityLevel) || ns.getServerMinSecurityLevel(s)) ? 0 : ns.hackAnalyzeChance(s),
        }})
        .map(s => serverCache[s.hostname] = s)
        //.filter(s => s.requiredHackingSkill <= ns.getPlayer().hacking)
        //.filter(s => (s.numOpenPortsRequired === 0) || (s.numOpenPortsRequired === 1 && s.sshPortOpen));
}

/** @param {NS} ns **/
async function scan(ns, servers, prefix) {
    const hackable = filterAndSort(ns, servers);
    //ns.tprint(hackable.length);

    let servers2 = [];
    for (const server of hackable) {
        //if (memory.find(m => m.split('/').pop() === server.hostname)) continue; // moved to filterAndSort
        //ns.tprint(`${prefix}${server.hostname}`);
        if (server.hasAdminRights) {
            memory.push(`${prefix}${server.hostname}`);
            servers2.push(server);
            servers2.push(...await scan(ns, (scanCache[server.hostname] || (scanCache[server.hostname] = await ns.scan(server.hostname))), `${prefix}${server.hostname}/`));
        } else {
            // okay lesgo
            //ns.tprint('nice server :heeeh:');
            unhackableMemory.push(server.hostname);
        }
    }
    return servers2;
}

/** @param {NS} ns **/
function dateprint(ns, start, str) {
    //ns.tprint(`[${Math.floor(Date.now() - start)}] ${str}`);
    ns.print(`[${Math.floor(Date.now() - start)}] ${str}`);
}

/** @param {NS} ns **/
export async function main(ns) {
    const start = Date.now();
    let seconds = 0;
    while (true) {
        seconds += 2;
        if (seconds % 50 === 0) {
            await mainHacknet(ns);
        }

        //dateprint(ns, start, 'scanning');
        memory = [];
        let scanned = (await scan(ns, scanCache[''] || (scanCache[''] = await ns.scan()), ''))
            .filter(s => s.hostname !== 'home' && s.hostname !== 'darkweb' && s.moneyAvailable !== 0);
        let sorted = scanned.sort((s2, s1) => s1.moneyAvailable - s2.moneyAvailable);
        //ns.tprint(sorted.map(s => `${s.hostname} - ${s.moneyAvailable}`).join('\n'));
        
        let moneyCache = []; // haha hahaah money cash ??? get it
        
        //dateprint(ns, start, 'shoving scripts');
        for (const server of memory) {
            //dateprint(ns, start, server);
            /*await ns.connect('home');
            for (const path of server.split('/')) {
                await ns.connect(path);
            }*/
            const s = server.split('/').pop();

            if (s === 'darkweb') continue;

            if (!ns.fileExists('grow.script', s)) await ns.scp('grow.script', 'home', s);
            if (!ns.fileExists('hack.script', s)) await ns.scp('hack.script', 'home', s);
            if (!ns.fileExists('weaken.script', s)) await ns.scp('weaken.script', 'home', s);

            let servIndex = 0;
            let ranScripts = 0;
            while (true) {
                const which = sorted[servIndex];
                servIndex++;
                if (!which) break;

                let command;
                if (which.chance < 0.75) {
                    command = 'weaken.script';
                } else if ((moneyCache[which.hostname] || (moneyCache[which.hostname] = ns.getServerMoneyAvailable(which.hostname))) < 1000) { // penis
                    command = 'grow.script';
                } else {
                    command = 'hack.script';
                }

                if (ns.isRunning(command, s, which.hostname)) continue;
                let scriptram = ramCache[command] || (ramCache[command] = ns.getScriptRam(command, s));
                let availram = (ramCache[s] || (ramCache[s] = ns.getServerMaxRam(s))) - ns.getServerUsedRam(s);
                if (scriptram > availram) break;

                let threads = Math.min(Math.floor(availram / scriptram), 4);

                //ns.tprint(`script ram: ${scriptram}, avail ram: ${availram}, total ram: ${ramCache[s]}`);

                const pid = await ns.exec(command, s, threads, which.hostname);
                if (pid === 0) break;
                ranScripts++;
                //dateprint(ns, start, `${server}: ${command} ${which.hostname}`);
            }

            if (ranScripts > 0) dateprint(ns, start, `shoved ${ranScripts} scripts onto ${server} :)`);
        }

        await ns.sleep(2000);
    }
}
