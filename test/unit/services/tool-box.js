import { provider } from '../../../src/app/services/navigation';
import { ToolType } from '../../../src/app/tools/interfaces';
import { store as storeProvider } from '../../../src/app/services/store';
import { defaultState } from '../utils';
const storeFactory = storeProvider();
const setState = (tool) => Object.assign({}, defaultState(), {
    tool
});
export default ({ test }) => {
    test('change the selected tool', t => {
        let state = null;
        const store = storeFactory();
        store.subscribe(() => {
            state = store.getState();
        });
        const service = provider(store);
        service.selectTool(ToolType.ITINERARY);
        t.eq(state, setState({
            selectedTool: ToolType.ITINERARY
        }));
        service.selectTool(null);
        t.eq(state, setState({
            selectedTool: null
        }));
    });
    test('unselect current selected tool', t => {
        let state = null;
        const store = storeFactory();
        store.subscribe(() => {
            state = store.getState();
        });
        const service = provider(store);
        service.selectTool(ToolType.ITINERARY);
        t.eq(state, setState({
            selectedTool: ToolType.ITINERARY
        }));
        service.unselectAll();
        t.eq(state, setState({
            selectedTool: null
        }));
    });
};
