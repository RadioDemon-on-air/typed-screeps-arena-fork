import { createConstructionSite } from "game/utils";
import { RANGED_ATTACK } from "game/constants";
import { Flag, Source, StructureContainer } from "game/prototypes";
import { findClosestByPath, getObjectsByPrototype } from "game/utils";
import { System, UpdatableSystem } from "../core/System";
import {
    ActionRequest,
    BuildActionRequest,
    CaptureFlagRequest,
    FillSpawn,
    SoloRaidRequest,
    StaticHarvestRequest,
} from "./RequestBus";

export class GameDirector extends System<ActionRequest> implements UpdatableSystem {
    init(): void {
        const firstSpawn = this.actorsBase.mySpawners[0];
        const closestSource = findClosestByPath<Source>(firstSpawn.objectLink, this.actorsBase.sources);

        let attackBonusFlags = getObjectsByPrototype(Flag).filter((i: any) => i.bonusType == RANGED_ATTACK);

        let myRangeAttackFlag = firstSpawn.objectLink.findClosestByRange(attackBonusFlags);

        let sourcePath = firstSpawn.objectLink.findPathTo(closestSource);
        let container = createConstructionSite(sourcePath[sourcePath.length - 1], StructureContainer);

        if (container.error) {
            console.log(
                `tried to build container ${sourcePath[sourcePath.length - 1].x}:${
                    sourcePath[sourcePath.length - 1].y
                }, but got ${container.error}`
            );
        }

        if (!closestSource) {
            console.log(`unable to find closest source!`);
            return;
        }

        this.requestsBase.addRequest(new CaptureFlagRequest(myRangeAttackFlag!));
        this.requestsBase.addRequest(new StaticHarvestRequest(closestSource));
        this.requestsBase.addRequest(new FillSpawn(firstSpawn));
        this.requestsBase.addRequest(new StaticHarvestRequest(closestSource));
        this.requestsBase.addRequest(new BuildActionRequest(container.object!));

        /*
        this.requestsBase.addRequest(new SoloRaidRequest(this.actorsBase.enemySpawners[0]));
        this.requestsBase.addRequest(new SoloRaidRequest(this.actorsBase.enemySpawners[0]));
        this.requestsBase.addRequest(new SoloRaidRequest(this.actorsBase.enemySpawners[0]));
        this.requestsBase.addRequest(new SoloRaidRequest(this.actorsBase.enemySpawners[0]));*/
        for (let i = 0; i < 50; i++) {
            this.requestsBase.addRequest(new SoloRaidRequest(this.actorsBase.enemySpawners[0]));
        }
    }

    update(): void {}

    onTaskResolved(id: number): void {}

    onNewRequest(request: ActionRequest): boolean {
        return false;
    }
}
/*
export class PopulationOrder {
    next: PopulationOrder | null = null;
    repeat: boolean = false;
    constructor(readonly task: ActionRequest, readonly maintain: boolean = false) {}

    chain(order: PopulationOrder): PopulationOrder {
        this.next = order;
        return order;
    }
}*/
