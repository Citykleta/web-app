import {ClickTool, ToolType} from './interfaces';
import {ServiceRegistry} from '../services/service-registry';

export const itineraryTool = (registry: ServiceRegistry): ClickTool => {
    const {itinerary} = registry;
    return {
        type: ToolType.ITINERARY,
        actionClick(p) {
            itinerary.addPoint(p);
        }
    };
};
