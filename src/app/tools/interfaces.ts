import {GeoCoord} from '../utils';

export enum ToolType {
    ITINERARY = 'ITINERARY',
    SEARCH = 'SEARCH',
    SETTINGS = 'SETTINGS'
}

export interface Tool {
    type: ToolType
}

export interface ClickTool extends Tool {
    actionClick(p: GeoCoord): any;
}
