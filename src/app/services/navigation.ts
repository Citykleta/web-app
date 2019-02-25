import {Events, Store, ToolSelectionState} from './store';
import {ToolType} from '../tools/interfaces';

export interface NavigationService {
    selectTool(tool: ToolType): void;

    unselectAll(): void;
}

export const provider = (store: Store): NavigationService => {
    let currentTool = null;

    store.on(Events.TOOL_CHANGED, (state: ToolSelectionState) => {
        currentTool = state.selectedTool;
    });

    return {
        selectTool(tool: ToolType) {
            if (tool !== currentTool) {
                store.selectTool(tool);
            }
        },
        unselectAll() {
            this.selectTool(null);
        }
    };
};
