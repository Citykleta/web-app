export enum ToolType {
    ITINERARY = 'ITINERARY',
    SEARCH = 'SEARCH'
}

export interface Tool {
    type: ToolType
}

export interface ClickTool extends Tool {
    actionClick(p: Point): void;
}

export interface Point {
    lng: number;
    lat: number;
}
