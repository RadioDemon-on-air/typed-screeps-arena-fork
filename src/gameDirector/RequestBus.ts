import { Creep, Flag, Source, ConstructionSite } from "game/prototypes";
import { CreepData } from "../classBehaviour/CreepAssignmentSystem";
import { SpawnerData } from "../classBehaviour/SpawnerSystem";
import { CreepType } from "./ActorsBase";
import { BodyPartConstant } from "game/constants";

export class RequestBus {
    public executors: Map<ActionType, RequestExecutor[]> = new Map();
    public unclamedRequests: Map<ActionType, ActionRequest[]> = new Map();

    public addRequest(request: ActionRequest) {
        if (!request) {
            return;
        }

        const executors = this.executors.get(request.actionType);
        if (executors && executors.length > 0) {
            for (const executor of executors) {
                if (executor.onNewRequest(request)) {
                    return;
                }
            }
        }

        let requestList = this.unclamedRequests.get(request.actionType);
        if (!requestList) {
            requestList = [];
            this.unclamedRequests.set(request.actionType, requestList);
        }

        console.log(`no executors for request ${request.actionType}`);
        requestList.push(request);
    }

    getNewRequest(actionType: ActionType): ActionRequest | null {
        const requests = this.unclamedRequests.get(actionType);
        console.log(`requested ${actionType} events, got ${requests?.length}`);

        if (requests && requests.length > 0) {
            return requests.shift()!;
        }

        return null;
    }

    public subscribe(actionType: ActionType, executor: RequestExecutor) {
        if (this.executors.has(actionType)) {
            this.executors.get(actionType)!.push(executor);
        } else {
            this.executors.set(actionType, [executor]);
        }

        const requests = this.unclamedRequests.get(actionType);

        if (requests && requests.length > 0) {
            return requests.shift()!;
        }
    }
}

export interface RequestExecutor {
    onNewRequest(request: ActionRequest): boolean;

    onTaskResolved(id: number): void;
}

export abstract class ActionRequest {
    completionId = -1;
    abstract actionType: ActionType;
}

export class SpawnRequest extends ActionRequest {
    parts: BodyPartConstant[];

    status: ActionStatus = ActionStatus.None;

    creep: Creep | null = null;

    actionType: ActionType = ActionType.Spawn;

    constructor(parts: BodyPartConstant[], readonly creepType: CreepType) {
        super();
        this.parts = parts;
    }
}

export class CaptureFlagRequest extends ActionRequest {
    actionType: ActionType = ActionType.CaptureFlag;

    constructor(readonly flag: Flag) {
        super();
    }
}

export class FillSpawn extends ActionRequest {
    status: ActionStatus = ActionStatus.None;

    actionType: ActionType = ActionType.FillSpawn;

    constructor(readonly spawner: SpawnerData) {
        super();
    }
}

export class StaticHarvestRequest extends ActionRequest {
    status: ActionStatus = ActionStatus.None;

    actionType: ActionType = ActionType.StaticHarvest4p;

    constructor(readonly source: Source) {
        super();
    }
}

export class StaticHarvestRequest5p extends StaticHarvestRequest {
    actionType: ActionType = ActionType.StaticHarvest5p;
}

export class DefendSpawnerRequest extends ActionRequest {
    status: ActionStatus = ActionStatus.None;

    actionType: ActionType = ActionType.DefendSpawn;

    constructor(readonly warriorCount: number, readonly spawner: SpawnerData) {
        super();
    }
}

export class SoloRaidRequest extends ActionRequest {
    status: ActionStatus = ActionStatus.None;

    actionType: ActionType = ActionType.SoloRaid;

    constructor(readonly spawner: SpawnerData) {
        super();
    }
}

export class CarryAction extends ActionRequest {
    status: ActionStatus = ActionStatus.None;

    actionType: ActionType = ActionType.CarryAction;

    constructor(readonly target: CreepData, readonly position: Position) {
        super();
    }
}

export class BuildActionRequest extends ActionRequest {
    actionType: ActionType = ActionType.BuildAction;

    status: ActionStatus = ActionStatus.None;

    constructor(readonly site: ConstructionSite) {
        super();
    }
}

export const enum ActionStatus {
    None = 0,
    Pending = 1,
    Ready = 2,
    Executing = 3,
    Success = 4,
    Cancelled = 5,
}

export const enum ActionType {
    Spawn = 1,
    CaptureFlag = 2,
    StaticHarvest5p = 3,
    StaticHarvest4p = 4,
    FillSpawn = 5,
    DefendSpawn = 6,
    SoloRaid = 7,
    CarryAction = 8,
    BuildAction = 9,
    BuildContainer = 10,
}

export interface Position {
    x: number;
    y: number;
}
