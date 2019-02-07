import {emitter} from 'smart-table-events';
import {ToolItem} from './navigation';

export interface Store {
    selectTool(tool: ToolItem | null): void;

    getState(): ApplicationState;

    on(event: Events, cb: Function): void;
}

export enum Events {
    TOOL_CHANGED = 'TOOL_CHANGED'
}

export interface ToolSelectionState {
    selectedTool: ToolItem | null;
}

export interface ApplicationState {
    tool: ToolSelectionState;
}

export const defaultState = (): ApplicationState => {
    return {
        tool: {
            selectedTool: null
        }
    };
};

export const provider = (): Store => {
    const eventEmitter = emitter();
    let state: ApplicationState = defaultState();
    return {
        selectTool(tool: ToolItem | null) {
            state.tool.selectedTool = tool;
            eventEmitter.dispatch(Events.TOOL_CHANGED, state.tool);
        },
        on(event: Events, cb: Function) {
            eventEmitter.on(event, cb);
        },
        getState() {
            return JSON.parse(JSON.stringify(state));
        }
    };
};

export default provider();
