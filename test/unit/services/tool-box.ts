import {Assert} from 'zora';
import {provider} from '../../../src/app/services/navigation';
import {ToolType} from '../../../src/app/tools/interfaces';
import {store as storeProvider} from '../../../src/app/services/store';

const storeFactory = storeProvider();

export default ({test}: Assert) => {
    test('change the selected tool', t => {
        let state = null;
        const store = storeFactory();
        store.subscribe(() => {
            state = store.getState();
        });
        const service = provider(store);
        service.selectTool(ToolType.ITINERARY);
        t.eq(state, {
            tool: {
                selectedTool: ToolType.ITINERARY
            },
            itinerary: {
                stops: [],
                routes: []
            }
        });
        service.selectTool(null);
        t.eq(state, {
            tool: {
                selectedTool: null
            },
            itinerary: {
                stops: [],
                routes: []
            }
        });
    });

    test('unselect current selected tool', t => {
        let state = null;
        const store = storeFactory();
        store.subscribe(() => {
            state = store.getState();
        });
        const service = provider(store);
        service.selectTool(ToolType.ITINERARY);
        t.eq(state, {
            tool: {
                selectedTool: ToolType.ITINERARY
            },
            itinerary: {
                stops: [],
                routes: []
            }
        });
        service.unselectAll();
        t.eq(state, {
            tool: {
                selectedTool: null
            },
            itinerary: {
                stops: [],
                routes: []
            }
        });
    });
}
