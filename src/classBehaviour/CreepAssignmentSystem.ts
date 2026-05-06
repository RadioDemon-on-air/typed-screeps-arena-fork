import { MOVE, CARRY, WORK, ATTACK, BodyPartConstant } from "game/constants";
import { Creep } from "game/prototypes";
import { System, UpdatableSystem } from "../core/System";
import { CreepType } from "../gameDirector/ActorsBase";
import {
    ActionType,
    ActionRequest,
    SpawnRequest,
    CaptureFlagRequest,
    DefendSpawnerRequest,
    FillSpawn,
    StaticHarvestRequest,
    BuildActionRequest,
} from "../gameDirector/RequestBus";

export class CreepAssignmentSystem extends System<CreepActionRequest> implements UpdatableSystem {
    activeTasks: Map<ActionType, CreepActionRequest[]> = new Map();
    pendingTasks: Map<ActionType, CreepActionRequest[]> = new Map();
    rolesDescription?: Map<ActionType, RoleDescription>;

    init(): void {
        this.requestsBase.subscribe(ActionType.StaticHarvest4p, this);
        this.requestsBase.subscribe(ActionType.StaticHarvest5p, this);
        this.requestsBase.subscribe(ActionType.FillSpawn, this);
        this.requestsBase.subscribe(ActionType.DefendSpawn, this);
        this.requestsBase.subscribe(ActionType.SoloRaid, this);

        this.rolesDescription = new Map();

        this.rolesDescription.set(ActionType.FillSpawn, new RoleDescription([MOVE, CARRY], CreepType.Carrier));

        this.rolesDescription.set(
            ActionType.StaticHarvest4p,
            new RoleDescription([WORK, WORK, WORK, WORK], CreepType.Harvester)
        );

        this.rolesDescription.set(
            ActionType.StaticHarvest5p,
            new RoleDescription([WORK, WORK, WORK, WORK, WORK], CreepType.Harvester)
        );

        this.rolesDescription.set(
            ActionType.SoloRaid,
            new RoleDescription(
                [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK],
                CreepType.Warrior
            )
        );
    }

    update(): void {
        for (const [key, requests] of this.pendingTasks) {
            if (!requests || requests.length == 0) {
                continue;
            }

            const requiredRole = this.rolesDescription!.get(key);
            if (!requiredRole) {
                console.log(`no role set for key: ${key}`);
                continue;
            }

            const unassignedCreeps = this.actorsBase.unassignedCreeps.get(requiredRole.creepType);
            if (!unassignedCreeps || unassignedCreeps.length == 0) {
                console.log(`no creeps for task ${key}`);
                continue;
            }

            while (unassignedCreeps.length > 0 && requests.length > 0) {
                const freeCreep = unassignedCreeps.pop();
                const request = requests.pop();
                freeCreep!.task = request!;

                console.log(`assigned ${request!.actionType} task to creep ${freeCreep!.objectLink.id}`);
            }
        }
    }

    onTaskResolved(id: number): void {
        const request = this.pendingRequestMap.get(id);
        this.pendingRequestMap.delete(id);
        if (request) {
            this.onNewRequest(request);
        }
    }

    onNewRequest(request: ActionRequest): boolean {
        const requiredRole = this.rolesDescription!.get(request.actionType);
        if (!requiredRole) {
            console.log(`no role set for key: ${request.actionType}`);
            return false;
        }

        const unassignedCreeps = this.actorsBase.unassignedCreeps.get(requiredRole.creepType);
        if (!unassignedCreeps || unassignedCreeps.length == 0) {
            this.requestSpawnOfType(requiredRole.creepType, requiredRole.body);
            this.addTaskToPending(request as CreepActionRequest);
            return true;
        }

        const creep = unassignedCreeps.pop();
        creep!.task = request as CreepActionRequest;

        return false;
    }

    requestSpawnOfType(creepType: CreepType, parts: BodyPartConstant[]) {
        console.log(`new creep requested of type, ${creepType}`);
        const spawnRequest = new SpawnRequest(parts, creepType);

        this.requestsBase.addRequest(spawnRequest);
    }

    addTaskToAccepted(request: CreepActionRequest) {
        if (!request) {
            return;
        }

        const activeTasks = this.activeTasks.get(request.actionType);

        if (activeTasks) {
            activeTasks.push(request);
        } else {
            this.activeTasks.set(request.actionType, [request]);
        }
    }

    addTaskToPending(request: CreepActionRequest) {
        if (!request) {
            return;
        }

        const pendingTasks = this.pendingTasks.get(request.actionType);

        console.log(`added task to pending ${request.actionType}`);
        if (pendingTasks) {
            pendingTasks.push(request);
        } else {
            this.pendingTasks.set(request.actionType, [request]);
        }
    }
}

class RoleDescription {
    constructor(readonly body: BodyPartConstant[], readonly creepType: CreepType) {}
}

export class CreepData {
    private _task: CreepActionRequest | null = null;
    public taskDirty: boolean = false;

    constructor(readonly objectLink: Creep, readonly creepType: CreepType) {}

    public set task(value: CreepActionRequest | null) {
        this.taskDirty = true;
        this._task = value;
    }

    public get task(): CreepActionRequest | null {
        return this._task;
    }
}

type CreepActionRequest =
    | CaptureFlagRequest
    | DefendSpawnerRequest
    | FillSpawn
    | StaticHarvestRequest
    | BuildActionRequest
    | null;
