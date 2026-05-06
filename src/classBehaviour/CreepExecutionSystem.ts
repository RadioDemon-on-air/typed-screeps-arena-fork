import { RESOURCE_ENERGY, ERR_NOT_IN_RANGE, OK, ERR_FULL } from "game/constants";
import { Resource } from "game/prototypes";
import { findInRange, getRange, findClosestByPath, getObjectsByPrototype } from "game/utils";
import { UpdatableSystem } from "../core/System";
import { ActorsBase } from "../gameDirector/ActorsBase";
import {
    ActionType,
    SoloRaidRequest,
    StaticHarvestRequest,
    DefendSpawnerRequest,
    FillSpawn,
} from "../gameDirector/RequestBus";
import { CreepData } from "./CreepAssignmentSystem";
import { SpawnerData } from "./SpawnerSystem";

export class CreepUpdateRunner implements UpdatableSystem {
    readonly orderRuntimes: Map<ActionType, Runtime> = new Map();
    readonly allRuntimes: Runtime[] = [];

    constructor(readonly actorsBase: ActorsBase) {
        const guardRuntime = new GuardSpawnerRuntime(this.actorsBase);
        this.allRuntimes.push(guardRuntime);
        this.orderRuntimes.set(ActionType.DefendSpawn, guardRuntime);

        const harvestRuntime = new StaticHarvestRuntime(this.actorsBase);
        this.allRuntimes.push(harvestRuntime);
        this.orderRuntimes.set(ActionType.StaticHarvest4p, harvestRuntime);
        this.orderRuntimes.set(ActionType.StaticHarvest5p, harvestRuntime);

        const fillSpawnRuntime = new FillSpawnRuntime(this.actorsBase);
        this.allRuntimes.push(fillSpawnRuntime);
        this.orderRuntimes.set(ActionType.FillSpawn, fillSpawnRuntime);

        const raiderRuntime = new SoloRaidRuntime(this.actorsBase);
        this.allRuntimes.push(raiderRuntime);
        this.orderRuntimes.set(ActionType.SoloRaid, raiderRuntime);
    }

    update(): void {
        for (const creepDatas of this.actorsBase.creepsByType.values()) {
            for (const creepData of creepDatas) {
                console.log(`processing creep ${creepData.objectLink.id}`);

                if (!creepData.taskDirty) {
                    console.log(`task is not dirty`);
                    continue;
                }

                creepData.taskDirty = false;

                for (const runtime of this.allRuntimes) {
                    if (runtime.dropCreep(creepData)) {
                        break;
                    }
                }

                if (!creepData.task) {
                    console.log(`no task for creep ${creepData.objectLink.id}`);
                    const creepsOfType = this.actorsBase.unassignedCreeps.get(creepData.creepType);
                    if (!creepsOfType) {
                        this.actorsBase.unassignedCreeps.set(creepData.creepType, [creepData]);
                    } else {
                        creepsOfType.push(creepData);
                    }

                    continue;
                }

                const runtime = this.orderRuntimes.get(creepData.task.actionType);

                if (!runtime) {
                    console.log(`there is no runtime for ${creepData.task.actionType}`);
                    continue;
                }

                runtime.assignCreep(creepData);
                console.log(`assigned to runtime, key ${creepData.task.actionType}`);
            }
        }

        for (const runtime of this.allRuntimes) {
            runtime.update();
        }
    }
}

abstract class Runtime {
    assignedCreeps: Set<CreepData> = new Set();

    abstract init(): void;

    abstract update(): void;

    assignCreep(creepData: CreepData): void {
        this.assignedCreeps.add(creepData);
    }

    dropCreep(creepData: CreepData): boolean {
        return this.assignedCreeps.delete(creepData);
    }

    constructor(readonly actorsBase: ActorsBase) {}
}

class SoloRaidRuntime extends Runtime {
    init(): void {}

    update(): void {
        this.assignedCreeps.forEach((creepData) => {
            const spawner = (creepData.task as SoloRaidRequest).spawner;
            //const attackCode = creepData.objectLink.attack(spawner.objectLink);
            //if (attackCode == ERR_NOT_IN_RANGE) {
            creepData.objectLink.moveTo(spawner.objectLink);
            //}
        });
    }
}

class StaticHarvestRuntime extends Runtime {
    init(): void {}

    update(): void {
        this.assignedCreeps.forEach((creepData) => {
            const free = creepData.objectLink.store.getFreeCapacity(RESOURCE_ENERGY);
            if ((free ?? 0) < 8) {
                creepData.objectLink.drop(RESOURCE_ENERGY);
            } else {
                const source = (creepData.task as StaticHarvestRequest).source;
                const harvestCode = creepData.objectLink.harvest(source);
                if (harvestCode == ERR_NOT_IN_RANGE) {
                    creepData.objectLink.moveTo(source);
                }
            }
        });
    }
}

class GuardSpawnerRuntime extends Runtime {
    guardedSpawners: Map<SpawnerData, Set<CreepData>> = new Map();

    override assignCreep(creepData: CreepData): void {
        this.assignedCreeps.add(creepData);
        const task = creepData!.task as DefendSpawnerRequest;
        const spawnGuard = this.guardedSpawners.get(task.spawner);
        if (spawnGuard) {
            spawnGuard.add(creepData);
        } else {
            this.guardedSpawners.set(task.spawner, new Set<CreepData>([creepData]));
        }
    }

    override dropCreep(creepData: CreepData): boolean {
        if (this.assignedCreeps.delete(creepData)) {
            for (const [_, guards] of this.guardedSpawners) {
                if (guards.delete(creepData)) {
                    break;
                }
            }

            return true;
        }

        return false;
    }

    init(): void {}

    update(): void {
        if (this.actorsBase.enemies.length == 0) {
            return;
        }

        for (const [spawnData, guards] of this.guardedSpawners) {
            const spawn = spawnData.objectLink;
            const closeEnemies = findInRange(spawn, this.actorsBase.enemies, 20);

            if (closeEnemies.length == 0) {
                for (const creep of guards) {
                    const range = getRange(creep.objectLink, spawn);
                    if (range < 4) {
                        creep.objectLink.moveTo(spawn, { flee: true });
                    } else if (range > 10) {
                        creep.objectLink.moveTo(spawn);
                    }
                }
                continue;
            }

            const closestEnemy = findClosestByPath(spawn, closeEnemies);

            for (const creep of guards) {
                const result = creep.objectLink.attack(closestEnemy);
                if (result == ERR_NOT_IN_RANGE) {
                    creep.objectLink.moveTo(closestEnemy);
                } else {
                    console.log(
                        `creep ${creep.objectLink.id} tried to attack enemy ${closestEnemy.id} but got ${result}`
                    );
                }
            }
        }
    }
}

class FillSpawnRuntime extends Runtime {
    servicedSpawners: Map<SpawnerData, Set<CreepData>> = new Map();

    override assignCreep(creepData: CreepData): void {
        this.assignedCreeps.add(creepData);
        const task = creepData!.task as FillSpawn;
        const spawnServant = this.servicedSpawners.get(task.spawner);
        if (spawnServant) {
            spawnServant.add(creepData);
        } else {
            this.servicedSpawners.set(task.spawner, new Set<CreepData>([creepData]));
        }
    }

    override dropCreep(creepData: CreepData): boolean {
        if (this.assignedCreeps.delete(creepData)) {
            for (const [_, guards] of this.servicedSpawners) {
                if (guards.delete(creepData)) {
                    break;
                }
            }

            return true;
        }

        return false;
    }

    init(): void {}

    update(): void {
        const droppedEnergy = getObjectsByPrototype(Resource).filter(
            (resource) => resource.resourceType == RESOURCE_ENERGY
        );

        for (const [spawnData, servants] of this.servicedSpawners) {
            const spawn = spawnData.objectLink;
            const closeEnergyPiles = findInRange(spawn, droppedEnergy, 10);

            for (const creep of servants) {
                const freeCapacity = creep.objectLink.store.getUsedCapacity(RESOURCE_ENERGY);
                if (freeCapacity ?? 0 <= 0) {
                    const transferCode = creep.objectLink.transfer(spawn, RESOURCE_ENERGY);
                    if (transferCode == OK || transferCode == ERR_FULL) {
                        continue;
                    } else {
                        creep.objectLink.moveTo(spawn);
                        continue;
                    }
                }

                if (closeEnergyPiles.length != 0) {
                    let bestEnergy = closeEnergyPiles[0];
                    for (const pile of closeEnergyPiles) {
                        if (pile.amount > bestEnergy.amount) {
                            bestEnergy = pile;
                        }
                    }

                    const pickupCode = creep.objectLink.pickup(bestEnergy);
                    if (pickupCode == OK) {
                        continue;
                    } else {
                        creep.objectLink.moveTo(bestEnergy);
                    }
                }
            }
        }
    }
}
