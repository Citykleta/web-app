import {ServiceRegistry} from './service-registry';
import {itineraryTool} from '../tools/itinerary';
import {searchPointerTool} from '../tools/search-pointer';
import {GeoCoord, truncate} from '../utils';
import {ClickTool, Tool} from '../tools/interfaces';

export interface MapToolService {
    actionClick(p: GeoCoord): void;
}

const isClickTool = (t: Tool): t is ClickTool =>
    t !== null && typeof (<ClickTool>t).actionClick === 'function';

export const provider = (registry: ServiceRegistry): MapToolService => {
    const tools: Tool[] = [searchPointerTool(registry), itineraryTool(registry)];
    const {store} = registry;
    let currentTool = tools[0]; // default

    store.subscribe(() => {
        const {selectedTool} = store.getState().tool;
        currentTool = tools.find(tool => tool.type === selectedTool) || null;
    });

    return {
        actionClick(p: GeoCoord) {
            if (isClickTool(currentTool)) {
                currentTool.actionClick({
                    lng: truncate(p.lng),
                    lat: truncate(p.lat)
                });
            }
        }
    };
};
