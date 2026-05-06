import * as game from "game/prototypes";
import * as utils from "game/utils";
import * as constants from "game/constants";
import { SpawnerData } from "../classBehaviour/SpawnerSystem.js";
import { CreepData } from "../classBehaviour/CreepAssignmentSystem.js";

export class ActorsBase {
	public creepsByType: Map<CreepType, CreepData[]> = new Map();
	public unassignedCreeps: Map<CreepType, CreepData[]> = new Map();

	public enemies: game.Creep[] = [];

	public myTowers: game.StructureTower[] = [];
	public enemyTowers: game.StructureTower[] = [];
	public neutralTowers: game.StructureTower[] = [];

	public containers: game.StructureContainer[] = [];

	public sources: game.Source[] = [];

	public mySpawners: SpawnerData[] = [];
	public enemySpawners: SpawnerData[] = [];
	public neutralSpawners: game.StructureSpawn[] = [];

	public allFlags: game.Flag[] = [];
	public vacantFlags: game.Flag[] = [];
	public targetedFlags: game.Flag[] = [];

	public fresh: boolean = true;

	public initDB() {
		if (this.fresh) {
			this.fresh = false;

			let allSpawners = utils.getObjectsByPrototype(game.StructureSpawn);
			for (const spawn of allSpawners) {
				if (spawn.my == undefined) {
					this.neutralSpawners.push(spawn);
				} else if (spawn.my) {
					this.mySpawners.push(new SpawnerData(spawn.id, spawn));
				} else {
					this.enemySpawners.push(new SpawnerData(spawn.id, spawn));
				}
			}

			let allCreeps = utils.getObjectsByPrototype(game.Creep);
			for (const creep of allCreeps) {
				this.addCreep(creep, CreepType.Unknown);
			}

			let allSources = utils.getObjectsByPrototype(game.Source);
			for (const source of allSources) {
				this.sources.push(source);
			}

			let allTowers = utils.getObjectsByPrototype(game.StructureTower);
			for (const tower of allTowers) {
				if (tower.my == undefined) {
					this.neutralTowers.push(tower);
					continue;
				}

				tower.my ? this.myTowers.push(tower) : this.enemyTowers.push(tower);
			}

			let allContainers = utils.getObjectsByPrototype(game.StructureContainer);
			for (const container of allContainers) {
				this.containers.push(container);
			}

			let allFlags = utils.getObjectsByPrototype(game.Flag);
			for (const flag of allFlags) {
				this.allFlags.push(flag);
				this.vacantFlags.push(flag);
			}
		}
	}

	public addCreep(creep: game.Creep, creepType: CreepType) {
		const creepData = new CreepData(creep, creepType);

		if (!creep.my) {
			this.enemies.push(creep);
			console.log(`added enemy creep ${creep.id}`);
			return;
		}

		if (creepType) {
			console.log(`added friendly creep of type ${creepType}, id: ${creep.id}`);
			if (this.unassignedCreeps.has(creepType)) {
				this.unassignedCreeps.get(creepType)!.push(creepData);
			} else {
				this.unassignedCreeps.set(creepType, [creepData]);
			}

			if (this.creepsByType.has(creepType)) {
				this.creepsByType.get(creepType)!.push(creepData);
			} else {
				this.creepsByType.set(creepType, [creepData]);
			}
		} else {
			console.log(`creep ${creep.id} has unknown type, skipping it`);
		}
	}
}

export const enum CreepType {
	Unknown = 0,
	Runner = 1,
	Harvester = 2,
	Warrior = 3,
	Healer = 4,
	Builder = 5,
	Carrier = 6,
}
