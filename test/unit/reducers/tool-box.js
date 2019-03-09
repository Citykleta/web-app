import { reducer } from '../../../src/app/reducers/tool-box';
import { ToolType } from '../../../src/app/tools/interfaces';
import { addItineraryPoint } from '../../../src/app/actions/itinerary';
import { selectTool } from '../../../src/app/actions/tool-box';
export default ({ test }) => {
    test('should return state is if the action type is different than SELECT_TOOL', t => {
        const actual = reducer({ selectedTool: ToolType.SEARCH }, addItineraryPoint({
            lng: 2323,
            lat: 23432
        }));
        t.eq(actual, { selectedTool: ToolType.SEARCH }, 'should return the same state');
    });
    test('should return state with the new selected tool', t => {
        const actual = reducer({ selectedTool: ToolType.SEARCH }, selectTool(ToolType.ITINERARY));
        t.eq(actual, { selectedTool: ToolType.ITINERARY }, 'should hve changed selected tool');
    });
};
