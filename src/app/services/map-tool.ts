import {GeoCoord, Tool} from '../tools/interfaces';
import {ServiceRegistry} from './service-registry';
import {itineraryTool} from '../tools/itinerary';
import {truncate} from '../util';

export interface MapToolService {
    actionClick(p: GeoCoord): void;
}

export const provider = (registry: ServiceRegistry): MapToolService => {
    const tools: Tool[] = [itineraryTool(registry)];
    const {store} = registry;
    let currentTool = null;

    store.subscribe(() => {
        const {selectedTool} = store.getState().tool;
        currentTool = tools.find(tool => tool.type === selectedTool) || null;
    });

    return {
        actionClick(p: GeoCoord) {
            if (currentTool !== null && typeof currentTool.actionClick === 'function') {
                currentTool.actionClick({
                    lng: truncate(p.lng),
                    lat: truncate(p.lat)
                });
            }
        }
    };
};
