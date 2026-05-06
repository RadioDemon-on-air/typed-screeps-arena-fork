/// <reference path="../index.d.ts" />
import { CreepAssignmentSystem } from "./classBehaviour/CreepAssignmentSystem.js";
import { CreepUpdateRunner } from "./classBehaviour/CreepExecutionSystem.js";
import { SpawnerSystem } from "./classBehaviour/SpawnerSystem.js";
import { UpdatableSystem } from "./core/System.js";
import { ActorsBase } from "./gameDirector/ActorsBase.js";
import { CompletionTracker } from "./gameDirector/CompletionTracker.js";
import { GameDirector } from "./gameDirector/GameDirector.js";
import { RequestBus } from "./gameDirector/RequestBus.js";

const actorsBase = new ActorsBase();
const requestBase = new RequestBus();
const completionTracker = new CompletionTracker();

let gameDirector: GameDirector;
let activeSystems: UpdatableSystem[] = [];
let inited = false;

export function loop() {
    if (!inited) {
        inited = true;

        actorsBase.initDB();

        activeSystems.push(new CreepAssignmentSystem(actorsBase, requestBase, completionTracker));
        activeSystems.push(new SpawnerSystem(actorsBase, requestBase, completionTracker));
        activeSystems.push(new CreepUpdateRunner(actorsBase));

        gameDirector = new GameDirector(actorsBase, requestBase, completionTracker);
    }

    for (const system of activeSystems) {
        system.update();
    }
}
