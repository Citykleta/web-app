import {ApplicationState} from '../../store/store';
import {ServiceRegistry} from '../../common/service-registry';
import {Store} from 'redux';
import {MapMouseEvent} from 'mapbox-gl';
import {View} from '../../navigation/reducer';
import {searchViewTool} from './search-tool';

export interface MapToolBox {

    addTool<T extends Tool>(view: View, tool: T): this;

    clickAction(ev: MapMouseEvent): Promise<void>

    longClickAction(ev: MapMouseEvent): Promise<void>
}

export interface Tool {
}

export interface ClickActionTool extends Tool {
    clickAction(ev: MapMouseEvent): Promise<void>
}

export interface LongClickActionTool extends Tool {
    longClickAction(ev: MapMouseEvent): Promise<void>
}

export const factory = (store: Store<ApplicationState>, registry: ServiceRegistry): MapToolBox => {
    const toolBox = new Map();
    toolBox.set(View.SEARCH, searchViewTool(registry));
    let currentTool = toolBox.get(View.SEARCH);

    store.subscribe(() => {
        const {selectedView} = store.getState().navigation;
        currentTool = toolBox.get(selectedView);
    });

    return {
        addTool(view, tool) {
            toolBox.set(view, tool);
            return this;
        },

        async clickAction(ev) {
            if (currentTool && typeof currentTool.clickAction === 'function') {
                currentTool.clickAction(ev);
            }
        },

        async longClickAction(ev: MapMouseEvent) {
            if (currentTool && typeof currentTool.longClickAction === 'function') {
                currentTool.longClickAction(ev);
            }
        }
    };
};