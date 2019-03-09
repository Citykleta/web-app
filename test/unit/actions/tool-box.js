import { selectTool } from '../../../src/app/actions/tool-box';
import { ToolType } from '../../../src/app/tools/interfaces';
import { ActionType } from '../../../src/app/actions/types';
export default ({ test }) => {
    test('create a select tool action', t => {
        const expected = {
            toolType: ToolType.ITINERARY,
            type: ActionType.SELECT_TOOL
        };
        t.eq(selectTool(ToolType.ITINERARY), expected);
    });
    test('foo', t => {
        // const store = mockStore();
        // store.dispatch(selectTool(ToolType.ITINERARY));
        //
        // // @ts-ignore
        // t.eq(store.getActions(),[],'f')
    });
};
