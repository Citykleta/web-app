import {selectTool} from '../../../src/app/actions/tool-box';
import {ToolType} from '../../../src/app/tools/interfaces';
import {ActionType} from '../../../src/app/actions/types';
import {Assert} from 'zora';

export default ({test}: Assert) => {
    test('create a select tool action', t => {
        const expected = {
            toolType: ToolType.ITINERARY,
            type: ActionType.SELECT_TOOL
        };

        t.eq(selectTool(ToolType.ITINERARY), expected);
    });
}
