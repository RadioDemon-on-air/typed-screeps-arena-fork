import { ActorsBase } from "../gameDirector/ActorsBase.js";
import { CompletionTracker } from "../gameDirector/CompletionTracker.js";
import { RequestExecutor, RequestBus, ActionRequest } from "../gameDirector/RequestBus.js";

export abstract class System<T> implements RequestExecutor {
	readonly pendingRequestMap: Map<number, T> = new Map();

	constructor(
		readonly actorsBase: ActorsBase,
		readonly requestsBase: RequestBus,
		readonly completionTracker: CompletionTracker
	) {
		this.init();
	}

	abstract init(): void;

	abstract onTaskResolved(id: number): void;

	abstract onNewRequest(request: ActionRequest): boolean;
}

export interface UpdatableSystem {
	update(): void;
}
