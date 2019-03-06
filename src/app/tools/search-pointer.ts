import {ClickTool, ToolType} from './interfaces';
import  {ServiceRegistry} from '../services/service-registry';

export const searchPointerTool = (registry: ServiceRegistry): ClickTool => {
    const {store} = registry;
    return {
        type: ToolType.SEARCH,
        actionClick(p) {
            store.reverse(p);
        }
    };
};
