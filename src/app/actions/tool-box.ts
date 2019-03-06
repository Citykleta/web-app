import {Action} from 'redux';
import {ActionType} from './types';
import {ToolType} from '../tools/interfaces';

export interface SelectToolAction extends Action<ActionType.SELECT_TOOL> {
    toolType: ToolType
}

export const selectTool = (tool: ToolType): SelectToolAction => ({
    type: ActionType.SELECT_TOOL,
    toolType: tool
});
