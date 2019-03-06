import {Reducer} from 'redux';
import {ToolType} from '../tools/interfaces';
import {ActionType} from '../actions/types';
import {SelectToolAction} from '../actions/tool-box';

export interface ToolBoxState {
    selectedTool: ToolType
}

export const reducer: Reducer<ToolBoxState> = (previousState = {selectedTool: null}, action) => {
    switch (action.type) {
        case ActionType.SELECT_TOOL: {
            const {toolType} = <SelectToolAction>action;
            return Object.assign({}, previousState, {selectedTool: toolType});
        }
        default:
            return previousState;
    }
};
