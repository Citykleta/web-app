import {Events, Store, ToolSelectionState} from './store';
import defaultStore from './store';

export enum ToolItem {
    ITINERARY = 'ITINERARY',
    SEARCH = 'SEARCH'
}

export interface NavigationService {
    selectTool(tool: ToolItem): void;

    unselectAll(): void;
}

export const provider = (store: Store): NavigationService => {
    let currentTool = null;

    store.on(Events.TOOL_CHANGED, (state: ToolSelectionState) => {
        currentTool = state.selectedTool;
    });

    return {
        selectTool(tool: ToolItem) {
            if (tool !== currentTool) {
                store.selectTool(tool);
            }
        },
        unselectAll() {
            this.selectTool(null);
        }
    };
};

export default provider(defaultStore);
