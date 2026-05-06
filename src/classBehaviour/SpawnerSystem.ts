import { StructureSpawn } from "game/prototypes";
import { System, UpdatableSystem } from "../core/System.js";
import { ActionRequest, SpawnRequest, ActionType, ActionStatus } from "../gameDirector/RequestBus.js";

export class SpawnerSystem extends System<SpawnerActionRequest> implements UpdatableSystem {
    onTaskResolved(id: number): void {
        throw new Error("Method not implemented.");
    }

    onNewRequest(request: ActionRequest): boolean {
        if (!request) {
            return false;
        }

        if (request instanceof SpawnRequest) {
            for (const spawner of this.actorsBase.mySpawners) {
                if (!spawner.task) {
                    spawner.task = request;
                    return true;
                }
            }
        }

        return false;
    }

    update(): void {
        for (const spawner of this.actorsBase.mySpawners) {
            this.iterateSpawner(spawner);
        }
    }

    init(): void {
        this.requestsBase.subscribe(ActionType.Spawn, this);
    }

    iterateSpawner(spawner: SpawnerData) {
        if (spawner.task instanceof SpawnRequest) {
            if (spawner.task.status == ActionStatus.None) {
                const spawnResult = spawner.objectLink.spawnCreep(spawner.task.parts);

                if (spawnResult.object) {
                    spawner.task.creep = spawnResult.object;
                    spawner.task.status = ActionStatus.Executing;
                    return;
                }

                if (spawnResult.error) {
                    console.log(spawnResult.error);
                    return;
                }
            } else if (spawner.task.status == ActionStatus.Executing) {
                if (spawner.objectLink.spawning) {
                    return;
                }

                if (spawner.task.creep) {
                    this.actorsBase.addCreep(spawner.task.creep, spawner.task.creepType);
                }

                const spawnRequest = this.requestsBase.getNewRequest(ActionType.Spawn);
                if (!spawnRequest) {
                    console.log("no new requests found");
                    spawner.task = null;
                    return;
                }

                spawner.task = spawnRequest as SpawnRequest;
            }
        }
    }
}

export class SpawnerData {
    readonly id: string | number;

    task: SpawnerActionRequest = null;

    readonly objectLink: StructureSpawn;

    constructor(id: string | number, link: StructureSpawn) {
        this.id = id;
        this.objectLink = link;
    }
}

export const enum Status {
    Idle = 0,
    Empty = 1,
}

type SpawnerActionRequest = SpawnRequest | null;
