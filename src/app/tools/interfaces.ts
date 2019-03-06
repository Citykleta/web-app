export enum ToolType {
    ITINERARY = 'ITINERARY',
    SEARCH = 'SEARCH'
}

export interface Tool {
    type: ToolType
}

export interface ClickTool extends Tool {
    actionClick(p: GeoCoord): void;
}

export interface GeoCoord {
    lng: number;
    lat: number;
}

export interface Location extends GeoCoord {
    name?: string;
}
