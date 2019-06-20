import {ToolType} from '../tools/interfaces';
import {Store} from 'redux';
import {ApplicationState} from './store';
import {selectTool} from '../actions/tool-box';

export interface NavigationService {
    selectTool(tool: ToolType): void;

    unselectAll(): void;
}

const navigationActions = {
    selectTool
};
export const provider = (store: Store<ApplicationState>, {
    selectTool
} = navigationActions): NavigationService => {
    return {
        selectTool(tool: ToolType) {
            store.dispatch(selectTool(tool));
        },
        unselectAll() {
            this.selectTool(null);
        }
    };
};
