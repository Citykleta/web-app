import {ClickTool, ToolType} from './interfaces';
import {ServiceRegistry} from '../services/service-registry';

export const itineraryTool = (registry: ServiceRegistry): ClickTool => {
    const {itinerary, store} = registry;
    return {
        type: ToolType.ITINERARY,
        actionClick(p) {
            const {focus} = store.getState().itinerary;
            if (focus !== null) {
                itinerary.updatePoint(focus, p);
                const searchbox = document.querySelector(`#itinerary-stop-point-${focus} input`);
                if(searchbox){
                    (<HTMLInputElement>searchbox).focus();
                }
            }
        }
    };
};
