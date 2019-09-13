import {ApplicationState} from "../store/store";
import {ServiceRegistry} from "../common/service-registry";
import {Store} from "redux";
import {MapMouseEvent} from "mapbox-gl";
import {View} from "../navigation/reducer";
import {SearchService} from "../search/service";
import {createGeoCoord} from "../utils";

export interface MapToolBox {
    clickAction(ev: MapMouseEvent): Promise<void>

    longClickAction(ev: MapMouseEvent): Promise<void>
}


export const factory = (store: Store<ApplicationState>, registry: ServiceRegistry): MapToolBox => {
    return {
        async clickAction(ev) {
            if (store.getState().navigation.selectedView === View.SEARCH) {
                const searchService: SearchService = registry.get('search');
                const {result} = await searchService.searchPointOfInterestNearBy(ev.lngLat);
                if (result.length) {
                    searchService.selectSearchResult(result[0]);
                }
            }
        },

        async longClickAction(ev: MapMouseEvent) {
            if (store.getState().navigation.selectedView === View.SEARCH) {
                const searchService: SearchService = registry.get('search');
                searchService.searchPointOfInterest('');
                searchService.selectSearchResult(createGeoCoord(ev.lngLat.lng, ev.lngLat.lat));

            }
        }
    }
};