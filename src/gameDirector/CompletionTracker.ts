import { RequestExecutor, ActionRequest } from "./RequestBus.js";

export class CompletionTracker {
	readonly clients: Map<number, RequestExecutor> = new Map();

	private requestId: number = 0;

	public trackCompletion(request: ActionRequest, system: RequestExecutor): number {
		request.completionId = this.requestId++;
		this.clients.set(request.completionId, system);
		return request.completionId;
	}

	public taskResolved(id: number) {
		if (id == -1) {
			return;
		}

		const client = this.clients.get(id);
		if (client) {
			client.onTaskResolved(id);
		}

		this.clients.delete(id);
	}
}
