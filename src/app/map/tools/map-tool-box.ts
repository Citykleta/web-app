import {MapMouseEvent} from 'mapbox-gl';
import {View} from '../../navigation/reducer';

export interface MapToolBox {
    selectTool(view): this;

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

export const factory = (): MapToolBox => {
    const toolBox = new Map();
    let currentTool = null;

    return {
        selectTool(view) {
            currentTool = toolBox.get(view);
            return this;
        },

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