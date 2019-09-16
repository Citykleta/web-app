import {ServiceRegistry} from '../../common/service-registry';
import {SearchService} from '../../search/service';
import {MapMouseEvent} from 'mapbox-gl';
import {createGeoCoord} from '../../utils';
import {ClickActionTool, LongClickActionTool} from './map-tool-box';

export const searchViewTool = (registry: ServiceRegistry): ClickActionTool & LongClickActionTool => {
    return {
        async clickAction(ev) {
            const searchService: SearchService = registry.get('search');
            const {result} = await searchService.searchPointOfInterestNearBy(ev.lngLat);
            if (result.length) {
                searchService.selectSearchResult(result[0]);
            }
        },

        async longClickAction(ev: MapMouseEvent) {
            const searchService: SearchService = registry.get('search');
            searchService.searchPointOfInterest('');
            searchService.selectSearchResult(createGeoCoord(ev.lngLat.lng, ev.lngLat.lat));
        }
    };
};