/** @param {NS} ns **/
export async function main(ns) {
	const servers = ns.getPurchasedServers();
	const pad = servers.reduce((s1, s2) => Math.max(s1 || 0, s2.length)) + 1;
    for (const server of servers) {
		const used = ns.getServerUsedRam(server);
		const max = ns.getServerMaxRam(server);
		const a = used/max;
		const chars = 20
		ns.tprint(`- ${server.padEnd(pad, ' ')}: used ${`${used}GB/${max}GB`.padEnd(16, ' ')} [${'|'.repeat(Math.floor(a * chars))}${'-'.repeat(Math.ceil((1 - a) * chars))}]`);
	}
}
