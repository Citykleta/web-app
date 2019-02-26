import {Events, Store, ToolSelectionState} from './store';
import {Point, Tool} from '../tools/interfaces';
import {ServiceRegistry} from './service-registry';
import {itineraryTool} from '../tools/itinerary';

export interface MapToolService {
    actionClick(p: Point): void;
}

export const provider = (registry: ServiceRegistry): MapToolService => {
    const tools: Tool[] = [itineraryTool(registry)];
    const {store} = registry;
    let currentTool = null;

    store.on(Events.TOOL_CHANGED, (state: ToolSelectionState) => {
        currentTool = tools.find(tool => tool.type === state.selectedTool) || null;
    });

    return {
        actionClick(p: Point) {
            if (currentTool !== null && typeof currentTool.actionClick === 'function') {
                currentTool.actionClick(p);
            }
        }
    };
};
